import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  GENERATION_DRAIN_BUDGET_MS,
  canPubliclyResumeGeneration,
} from "@/lib/generation-steps";
import { createGenerationRuntime } from "@/lib/generation-runtime";
import { drainGeneration } from "@/lib/generation-workflow";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function tokensMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id?.trim()) return json({ error: "Not found" }, 404);

  let resumeToken = "";
  try {
    const body = (await request.json()) as { resumeToken?: unknown };
    resumeToken = typeof body.resumeToken === "string" ? body.resumeToken.trim() : "";
  } catch {
    return json({ error: "Missing resume token" }, 401);
  }
  if (!resumeToken) return json({ error: "Missing resume token" }, 401);

  const supabase = createAdminSupabaseClient();
  if (!supabase) return json({ error: "Not found" }, 404);

  const { data: book, error } = await supabase
    .from("books")
    .select("id, generation_resume_token, status, generation_auto_run")
    .eq("order_id", id)
    .maybeSingle();

  if (error || !book?.generation_resume_token) return json({ error: "Not found" }, 404);
  if (!tokensMatch(resumeToken, book.generation_resume_token)) {
    return json({ error: "Not found" }, 404);
  }

  if (
    !canPubliclyResumeGeneration({
      status: book.status,
      generationAutoRun: Boolean(book.generation_auto_run),
    })
  ) {
    return json(
      {
        error: "Generation is paused. Resume only through inspected recovery.",
        paused: true,
      },
      409,
    );
  }

  const runtime = await createGenerationRuntime(book.id);
  if (!runtime) return json({ error: "Not found" }, 404);

  const deadline = Date.now() + Math.min(GENERATION_DRAIN_BUDGET_MS, (maxDuration - 20) * 1000);
  const result = await drainGeneration(book.id, runtime, deadline);

  return json({
    ok: true,
    ran: result.ran,
    phase: result.phase,
  });
}
