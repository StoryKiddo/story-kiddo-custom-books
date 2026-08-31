"use client";

/**
 * Collects name, age, and photo for 1–4 children in one book order.
 *
 * Each photo is cropped in the browser first. The cropped file is what the
 * `createOrder` Server Action receives and uploads to Supabase Storage.
 */

import { useActionState, useState } from "react";
import { PhotoCropField } from "@/components/photo-crop-field";
import { createOrder, type CreateOrderState } from "@/lib/actions/create-order";
import { MAX_CHILDREN_PER_BOOK } from "@/lib/orders";
import type { Track } from "@/lib/tracks";

type ChildDraft = {
  id: string;
};

function emptyChild(id: string): ChildDraft {
  return { id };
}

export function ChildDetailsForm({ track }: { track: Track }) {
  const [state, formAction, pending] = useActionState<CreateOrderState, FormData>(
    createOrder,
    null,
  );
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild("1")]);
  const [nextId, setNextId] = useState(2);

  function addChild() {
    if (children.length >= MAX_CHILDREN_PER_BOOK) return;
    setChildren((current) => [...current, emptyChild(String(nextId))]);
    setNextId((value) => value + 1);
  }

  function removeChild(id: string) {
    if (children.length <= 1) return;
    setChildren((current) => current.filter((child) => child.id !== id));
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="track" value={track.slug} />

      <div className="space-y-6">
        {children.map((child, index) => (
          <ChildCard
            key={child.id}
            child={child}
            index={index}
            total={children.length}
            track={track}
            pending={pending}
            onRemove={() => removeChild(child.id)}
          />
        ))}
      </div>

      {children.length < MAX_CHILDREN_PER_BOOK ? (
        <button
          type="button"
          onClick={addChild}
          disabled={pending}
          className="rounded-full border border-ink/12 bg-cream/80 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream disabled:opacity-70"
        >
          Add another child
        </button>
      ) : (
        <p className="text-sm text-ink-soft">Four children is the maximum for one book.</p>
      )}

      {state?.error ? (
        <p className="rounded-2xl bg-[#f5d0d8] px-4 py-3 text-sm font-semibold text-[#7a2d3d]" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-coral px-8 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Saving your book…" : "Create this book"}
      </button>
    </form>
  );
}

function ChildCard({
  child,
  index,
  total,
  track,
  pending,
  onRemove,
}: {
  child: ChildDraft;
  index: number;
  total: number;
  track: Track;
  pending: boolean;
  onRemove: () => void;
}) {
  const headingId = `child-heading-${child.id}`;
  const label = total === 1 ? "Your child" : `Child ${index + 1}`;

  return (
    <fieldset
      disabled={pending}
      aria-labelledby={headingId}
      className="rounded-3xl border border-rule bg-white/60 p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-display text-lg text-ink">
          {label}
        </h3>
        {total > 1 ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">Child&apos;s name</span>
          <input
            name="childName"
            type="text"
            required
            maxLength={40}
            autoComplete="given-name"
            placeholder="Maya"
            className="w-full rounded-2xl border border-rule bg-cream px-4 py-3 text-ink outline-none ring-coral/30 focus:ring-2"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">Age</span>
          <input
            name="childAge"
            type="number"
            required
            min={0}
            max={12}
            placeholder="4"
            className="w-full rounded-2xl border border-rule bg-cream px-4 py-3 text-ink outline-none ring-coral/30 focus:ring-2"
          />
          {index === 0 ? (
            <span className="block text-xs text-ink-soft">
              Whole years, from 0 to 12. {track.ageRange} is the sweet spot for this theme.
            </span>
          ) : null}
        </label>
      </div>

      <PhotoCropField id={child.id} label={label} pending={pending} />
    </fieldset>
  );
}
