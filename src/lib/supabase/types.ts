/**
 * Database row shapes that match `supabase/migrations/`.
 *
 * When the schema changes, update this file (or later generate it with
 * `supabase gen types typescript`). Keeping these types by hand is fine
 * for this first foundation.
 */
export type OrderStatus = "received" | "generating" | "ready" | "failed";
export type BookStatus = "pending" | "generating" | "illustrating" | "complete" | "failed";

export type CustomerRow = {
  id: string;
  email: string | null;
  created_at: string;
};

export type TrackRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  age_range: string;
  cover: string;
  ink: string;
  sort_order: number;
  created_at: string;
};

export type OrderRow = {
  id: string;
  customer_id: string;
  track_id: string;
  /** Customer-facing six-digit number. Distinct from the UUID primary key. */
  order_number: number;
  /** Legacy single-child fields. New orders store children in book_children. */
  child_name: string | null;
  child_age: number | null;
  photo_path: string | null;
  status: OrderStatus;
  created_at: string;
};

export type BookChildRow = {
  id: string;
  order_id: string;
  child_name: string;
  child_age: number;
  photo_path: string | null;
  sort_order: number;
  interests: string[];
  custom_interest: string | null;
  personal_note: string | null;
  created_at: string;
};

export type BookRow = {
  id: string;
  order_id: string;
  title: string | null;
  status: BookStatus;
  page_count: number | null;
  pages: string[] | null;
  illustrations: (string | null)[] | null;
  /** Storage path of the generated cover, whose title is lettered into the art. */
  cover_path: string | null;
  /** Giver line painted at the foot of the cover, e.g. "From Mom and Dad". */
  dedication: string | null;
  preview_generated: boolean;
  /** Order-page secret used to POST /generation-tick. Never expose on GET status. */
  generation_resume_token: string;
  /** When false, POST /generation-tick will not start model calls. Existing books stay false. */
  generation_auto_run: boolean;
  story_type: string | null;
  blueprint: Record<string, unknown> | null;
  continuity: Record<string, unknown> | null;
  page_plan: Record<string, unknown>[] | null;
  created_at: string;
};

export type BookGenerationStepId = "story" | "cover" | "page_0" | "page_1";
export type BookGenerationStepStatus = "pending" | "running" | "complete" | "failed" | "held";

export type BookGenerationStepRow = {
  book_id: string;
  step: BookGenerationStepId;
  status: BookGenerationStepStatus;
  attempts: number;
  max_attempts: number;
  lease_token: string | null;
  lease_expires_at: string | null;
  next_retry_at: string | null;
  last_error: string | null;
  artifact_path: string | null;
  completed_at: string | null;
  updated_at: string;
};

/**
 * Minimal Database typing so supabase-js can autocomplete table names.
 * Expand this as more tables or RPCs are added.
 */
export type Database = {
  public: {
    Tables: {
      customers: {
        Row: CustomerRow;
        Insert: Partial<CustomerRow> & { email?: string | null };
        Update: Partial<CustomerRow>;
        Relationships: [];
      };
      tracks: {
        Row: TrackRow;
        Insert: Partial<TrackRow> & { slug: string; name: string };
        Update: Partial<TrackRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> & {
          customer_id: string;
          track_id: string;
        };
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      book_children: {
        Row: BookChildRow;
        Insert: Partial<BookChildRow> & {
          order_id: string;
          child_name: string;
          child_age: number;
        };
        Update: Partial<BookChildRow>;
        Relationships: [];
      };
      books: {
        Row: BookRow;
        Insert: Partial<BookRow> & { order_id: string };
        Update: Partial<BookRow>;
        Relationships: [];
      };
      book_generation_steps: {
        Row: BookGenerationStepRow;
        Insert: Partial<BookGenerationStepRow> & {
          book_id: string;
          step: BookGenerationStepId;
        };
        Update: Partial<BookGenerationStepRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_book_generation_step: {
        Args: {
          p_book_id: string;
          p_step: string;
          p_lease_token: string;
          p_lease_seconds: number;
        };
        Returns: BookGenerationStepRow | null;
      };
      generation_step_owns_lease: {
        Args: { p_book_id: string; p_step: string; p_lease_token: string };
        Returns: boolean;
      };
      complete_book_generation_step: {
        Args: {
          p_book_id: string;
          p_step: string;
          p_lease_token: string;
          p_artifact_path: string | null;
        };
        Returns: boolean;
      };
      fail_book_generation_step: {
        Args: {
          p_book_id: string;
          p_step: string;
          p_lease_token: string;
          p_error: string;
          p_next_retry_at: string;
        };
        Returns: boolean;
      };
      hold_book_generation_step: {
        Args: {
          p_book_id: string;
          p_step: string;
          p_lease_token: string;
          p_error: string;
        };
        Returns: boolean;
      };
      save_book_cover_if_lease: {
        Args: { p_book_id: string; p_lease_token: string; p_cover_path: string };
        Returns: boolean;
      };
      save_book_illustration_if_lease: {
        Args: {
          p_book_id: string;
          p_step: string;
          p_lease_token: string;
          p_page_index: number;
          p_preview_path: string;
        };
        Returns: boolean;
      };
      save_book_story_if_lease: {
        Args: {
          p_book_id: string;
          p_lease_token: string;
          p_pages: unknown;
          p_blueprint: unknown;
          p_continuity: unknown;
          p_page_plan: unknown;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
