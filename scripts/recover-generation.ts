/**
 * Inspect (default) or resume generation for ONE saved order.
 *
 * Default is read-only. It never calls Anthropic or OpenAI.
 *
 *   node --experimental-strip-types scripts/recover-generation.ts \
 *     --order-id 2678ceb9-e58f-4ad8-b41b-fc4fd00c279d
 *
 * --execute is disabled unless --confirm-order-id matches. Do not pass it
 * until existing storage objects and likely image-model costs have been reviewed.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createAdminSupabaseClient } from "../src/lib/supabase/admin.ts";
import { coverObjectPath } from "../src/lib/cover-prompt.ts";
import {
  masterIllustrationObjectPath,
  previewIllustrationObjectPath,
} from "../src/lib/illustration-watermark.ts";
import { planRecovery, GENERATION_DRAIN_BUDGET_MS } from "../src/lib/generation-steps.ts";

const STRANDED_ORDER_ID = "2678ceb9-e58f-4ad8-b41b-fc4fd00c279d";

function loadLocalEnv(): void {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  let text = "";
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function objectExists(
  supabase: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  objectPath: string,
): Promise<boolean> {
  const parts = objectPath.split("/");
  const name = parts.pop();
  const dir = parts.join("/");
  if (!name) return false;
  const { data, error } = await supabase.storage.from("book-illustrations").list(dir, {
    search: name,
    limit: 20,
  });
  if (error || !data) return false;
  return data.some((entry) => entry.name === name);
}

async function inspect(orderId: string) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    console.error("Supabase is not configured. Add keys to .env.local first.");
    process.exit(1);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    console.error("Order not found.");
    process.exit(1);
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, status, pages, illustrations, cover_path, preview_generated")
    .eq("order_id", order.id)
    .maybeSingle();
  if (bookError || !book) {
    console.error("Book row not found.");
    process.exit(1);
  }

  const { count: childCount } = await supabase
    .from("book_children")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);

  const { data: steps } = await supabase
    .from("book_generation_steps")
    .select("step, status, attempts, max_attempts, lease_expires_at, last_error, artifact_path")
    .eq("book_id", book.id);

  const artifacts = {
    cover: await objectExists(supabase, coverObjectPath(book.id)),
    master: [
      await objectExists(supabase, masterIllustrationObjectPath(book.id, 0)),
      await objectExists(supabase, masterIllustrationObjectPath(book.id, 1)),
    ],
    preview: [
      await objectExists(supabase, previewIllustrationObjectPath(book.id, 0)),
      await objectExists(supabase, previewIllustrationObjectPath(book.id, 1)),
    ],
  };

  const pages = Array.isArray(book.pages)
    ? book.pages.filter((page): page is string => typeof page === "string")
    : [];
  const illustrations = Array.isArray(book.illustrations)
    ? book.illustrations.map((entry) => (typeof entry === "string" ? entry : null))
    : [];

  const plan = planRecovery({
    orderId: order.id,
    book: {
      id: book.id,
      status: book.status,
      pages,
      coverPath: book.cover_path,
      illustrations,
      previewGenerated: Boolean(book.preview_generated),
    },
    artifacts,
  });

  const report = {
    orderId: order.id,
    orderNumber: order.order_number,
    bookStatus: book.status,
    previewGenerated: book.preview_generated,
    storyPageCount: pages.length,
    childRows: childCount ?? 0,
    coverObject: artifacts.cover,
    previewObjects: artifacts.preview,
    masterObjects: artifacts.master,
    steps: steps ?? [],
    wouldCallStoryModel: plan.wouldCallStoryModel,
    wouldCallImageModel: plan.wouldCallImageModel,
    wouldSkip: plan.wouldSkip,
    warnings: plan.warnings,
    execute: false,
  };

  console.log(JSON.stringify(report, null, 2));
  console.log("\nInspect only. No model calls were made.");
  if (plan.wouldCallImageModel.length > 0) {
    console.log(
      `Likely gpt-image-2 calls if executed later: ${plan.wouldCallImageModel.join(", ")}.`,
    );
  } else {
    console.log("No image-model calls would be needed if this order is resumed.");
  }
}

async function execute(orderId: string) {
  await inspect(orderId);
  const [{ createGenerationRuntime, armInspectedRecovery }, { drainGeneration }, { createAdminSupabaseClient: admin }] =
    await Promise.all([
      import("../src/lib/generation-runtime.ts"),
      import("../src/lib/generation-workflow.ts"),
      import("../src/lib/supabase/admin.ts"),
    ]);
  const supabase = admin();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data } = await supabase.from("books").select("id").eq("order_id", orderId).maybeSingle();
  if (!data) throw new Error("Book row not found.");
  const released = await armInspectedRecovery(data.id);
  console.log(JSON.stringify({ execute: true, releasedHeldOrExpiredSteps: released }, null, 2));
  const runtime = await createGenerationRuntime(data.id);
  if (!runtime) throw new Error("Could not build generation runtime.");
  const result = await drainGeneration(data.id, runtime, Date.now() + GENERATION_DRAIN_BUDGET_MS);
  console.log(JSON.stringify({ execute: true, ran: result.ran, phase: result.phase }, null, 2));
}

async function main() {
  loadLocalEnv();
  const orderId = argValue("--order-id")?.trim() ?? "";
  if (!orderId) {
    console.error("Pass a single --order-id <uuid>. This tool will not scan every order.");
    process.exit(1);
  }
  if (hasFlag("--execute")) {
    const confirmed = argValue("--confirm-order-id")?.trim();
    if (confirmed !== orderId) {
      console.error(
        "Refusing to execute. Inspect first, then pass --execute --confirm-order-id <same uuid> after costs are reviewed.",
      );
      process.exit(1);
    }
    await execute(orderId);
    return;
  }
  await inspect(orderId);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Recovery inspect failed.");
  process.exit(1);
});

void STRANDED_ORDER_ID;
