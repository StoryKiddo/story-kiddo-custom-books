"use client";

/**
 * Collects the child's name, age, and photo.
 *
 * Photo preview stays in the browser (URL.createObjectURL). The actual file
 * is sent to the `createOrder` Server Action on submit, which uploads it to
 * Supabase Storage when credentials are configured.
 */

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createOrder, type CreateOrderState } from "@/lib/actions/create-order";
import type { Track } from "@/lib/tracks";

export function ChildDetailsForm({ track }: { track: Track }) {
  const [state, formAction, pending] = useActionState<CreateOrderState, FormData>(
    createOrder,
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoId = useId();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onPhotoChange(file: File | undefined) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setPreviewUrl(null);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="track" value={track.slug} />

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
            className="w-full rounded-2xl border border-rule bg-white px-4 py-3 text-ink outline-none ring-coral/30 focus:ring-2"
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
            className="w-full rounded-2xl border border-rule bg-white px-4 py-3 text-ink outline-none ring-coral/30 focus:ring-2"
          />
          <span className="block text-xs text-ink-soft">
            Whole years, from 0 to 12. {track.ageRange} is the sweet spot for this track.
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor={photoId} className="text-sm font-semibold text-ink">
          Photo of your child
        </label>
        <p className="text-sm text-ink-soft">
          A clear face photo works best. JPG, PNG, or WebP, up to 8 MB.
        </p>
        <input
          id={photoId}
          ref={fileInputRef}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="sr-only"
          onChange={(event) => onPhotoChange(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (!file || !fileInputRef.current) return;
            const transfer = new DataTransfer();
            transfer.items.add(file);
            fileInputRef.current.files = transfer.files;
            onPhotoChange(file);
          }}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink/20 bg-white/70 px-6 py-10 text-center transition hover:border-coral hover:bg-white"
        >
          {previewUrl ? (
            // Preview is a blob URL created in the browser, not a remote image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview of the uploaded photo"
              className="h-40 w-40 rounded-3xl object-cover shadow-[3px_3px_0_0_rgba(43,36,28,0.12)]"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-deep text-2xl text-ink-soft">
              +
            </span>
          )}
          <span className="text-sm font-semibold text-ink">
            {fileName ? fileName : "Drop a photo here, or click to browse"}
          </span>
        </button>
      </div>

      {state?.error ? (
        <p className="rounded-2xl bg-[#f5d0d8] px-4 py-3 text-sm font-semibold text-[#7a2d3d]" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-coral px-8 py-3 text-sm font-semibold text-white shadow-[3px_3px_0_0_#b54e35] transition hover:bg-coral-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Saving your book…" : "Create this book"}
      </button>
    </form>
  );
}
