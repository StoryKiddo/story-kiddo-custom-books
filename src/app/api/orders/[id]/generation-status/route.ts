import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { GENERATION_STATUS_SELECT } from "@/lib/generation-status";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function notFoundResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
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

  return NextResponse.json(
    {
      status: book.status,
      previewGenerated: Boolean(book.preview_generated),
    },
    { headers: NO_STORE },
  );
}
