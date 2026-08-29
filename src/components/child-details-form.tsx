"use client";

/**
 * Collects name, age, and photo for 1–4 children in one book order.
 *
 * Photo previews stay in the browser (URL.createObjectURL). The actual files
 * are sent to the `createOrder` Server Action on submit, which uploads them
 * to Supabase Storage when credentials are configured.
 */

import { useActionState, useEffect, useRef, useState } from "react";
import { createOrder, type CreateOrderState } from "@/lib/actions/create-order";
import { MAX_CHILDREN_PER_BOOK } from "@/lib/orders";
import type { Track } from "@/lib/tracks";

type ChildDraft = {
  id: string;
  previewUrl: string | null;
  fileName: string | null;
};

function emptyChild(id: string): ChildDraft {
  return { id, previewUrl: null, fileName: null };
}

export function ChildDetailsForm({ track }: { track: Track }) {
  const [state, formAction, pending] = useActionState<CreateOrderState, FormData>(
    createOrder,
    null,
  );
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild("1")]);
  const [nextId, setNextId] = useState(2);

  useEffect(() => {
    return () => {
      for (const child of children) {
        if (child.previewUrl) URL.revokeObjectURL(child.previewUrl);
      }
    };
    // Revoke leftover blob URLs only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPhotoChange(id: string, file: File | undefined) {
    setChildren((current) =>
      current.map((child) => {
        if (child.id !== id) return child;
        if (child.previewUrl) URL.revokeObjectURL(child.previewUrl);
        if (!file) {
          return { ...child, previewUrl: null, fileName: null };
        }
        return {
          ...child,
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
        };
      }),
    );
  }

  function addChild() {
    if (children.length >= MAX_CHILDREN_PER_BOOK) return;
    setChildren((current) => [...current, emptyChild(String(nextId))]);
    setNextId((value) => value + 1);
  }

  function removeChild(id: string) {
    if (children.length <= 1) return;
    setChildren((current) => {
      const target = current.find((child) => child.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((child) => child.id !== id);
    });
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
            onPhotoChange={(file) => onPhotoChange(child.id, file)}
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
  onPhotoChange,
  onRemove,
}: {
  child: ChildDraft;
  index: number;
  total: number;
  track: Track;
  pending: boolean;
  onPhotoChange: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photoId = `photo-${child.id}`;
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

      <div className="mt-6 space-y-2">
        <label htmlFor={photoId} className="text-sm font-semibold text-ink">
          Photo of your child
        </label>
        <p className="text-sm text-ink-soft">
          A clear face photo works best. JPG, PNG, or WebP, up to 8 MB.
        </p>
        <input
          id={photoId}
          ref={inputRef}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="sr-only"
          onChange={(event) => onPhotoChange(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (!file || !inputRef.current) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            inputRef.current.files = transfer.files;
            onPhotoChange(file);
          }}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink/20 bg-cream/70 px-6 py-10 text-center transition hover:border-coral hover:bg-cream"
        >
          {child.previewUrl ? (
            // Preview is a blob URL created in the browser, not a remote image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={child.previewUrl}
              alt={`Preview of the uploaded photo for ${label.toLowerCase()}`}
              className="h-40 w-40 rounded-3xl object-cover shadow-[0_12px_24px_-12px_rgba(36,28,22,0.28)]"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-deep text-2xl text-ink-soft">
              +
            </span>
          )}
          <span className="text-sm font-semibold text-ink">
            {child.fileName ? child.fileName : "Drop a photo here, or click to browse"}
          </span>
        </button>
      </div>
    </fieldset>
  );
}

