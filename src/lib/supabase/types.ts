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
  preview_generated: boolean;
  story_type: string | null;
  blueprint: Record<string, unknown> | null;
  continuity: Record<string, unknown> | null;
  page_plan: Record<string, unknown>[] | null;
  created_at: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
