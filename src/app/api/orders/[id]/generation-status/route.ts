import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { GENERATION_STATUS_SELECT } from "@/lib/generation-status";
import { describeGenerationPhase, canClaimStep, canPubliclyResumeGeneration, type GenerationStepRow } from "@/lib/generation-steps";
import type { BookGenerationStepRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function notFoundResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
}

function asStepRow(row: BookGenerationStepRow): GenerationStepRow {
  return {
    bookId: row.book_id,
    step: row.step,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    leaseToken: row.lease_token,
    leaseExpiresAt: row.lease_expires_at,
    nextRetryAt: row.next_retry_at,
    lastError: row.last_error,
    artifactPath: row.artifact_path,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id?.trim()) return notFoundResponse();

  const supabase = createAdminSupabaseClient();
  if (!supabase) return notFoundResponse();

  const { data: book, error } = await supabase
    .from("books")
    .select(GENERATION_STATUS_SELECT)
    .eq("order_id", id)
    .maybeSingle();

  if (error || !book) return notFoundResponse();

  const bookId = book.id;
  const { data: stepRows } = await supabase
    .from("book_generation_steps")
    .select(
      "book_id, step, status, attempts, max_attempts, lease_token, lease_expires_at, next_retry_at, last_error, artifact_path",
    )
    .eq("book_id", bookId);

  const coverReady = Boolean(book.cover_path);
  const steps = (stepRows ?? []).map((row) => asStepRow(row as BookGenerationStepRow));
  const previewReadyCount = steps.filter(
    (row) => (row.step === "page_0" || row.step === "page_1") && row.status === "complete",
  ).length;
  const now = Date.now();
  const phase = steps.length > 0 ? describeGenerationPhase(steps, now) : undefined;
  const needsTick =
    canPubliclyResumeGeneration({
      status: book.status,
      generationAutoRun: Boolean(book.generation_auto_run),
    }) &&
    Boolean(phase) &&
    phase !== "complete" &&
    phase !== "failed" &&
    phase !== "held" &&
    steps.some((row) => canClaimStep(row, now));

  return NextResponse.json(
    {
      status: book.status,
      previewGenerated: Boolean(book.preview_generated),
      coverReady,
      previewReadyCount,
      phase: phase ?? null,
      needsTick,
    },
    { headers: NO_STORE },
  );
}
