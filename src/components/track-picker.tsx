"use client";

/**
 * Lets a parent pick one educational track, then continue to the child
 * details form. Selection is local React state — nothing is saved until
 * the later form is submitted.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrackCard } from "@/components/track-card";
import type { Track } from "@/lib/tracks";

export function TrackPicker({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selected = tracks.find((track) => track.slug === selectedSlug);

  return (
    <div className="space-y-10">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
        {tracks.map((track) => (
          <TrackCard
            key={track.slug}
            track={track}
            selected={track.slug === selectedSlug}
            onSelect={() => setSelectedSlug(track.slug)}
          />
        ))}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-rule bg-cream/80 px-6 py-5 sm:flex-row sm:items-center sm:px-7 sm:py-6">
        <p className="text-ink-soft">
          {selected ? (
            <>
              You chose <span className="font-semibold text-ink">{selected.name}</span>
              {" — "}
              {selected.tagline}.
            </>
          ) : (
            "Select a track to personalize a book."
          )}
        </p>
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            router.push(`/create?track=${selected.slug}`);
          }}
          className="rounded-full bg-coral px-6 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_16px_-8px_rgba(181,78,53,0.7)] transition enabled:hover:bg-coral-dark disabled:cursor-not-allowed disabled:bg-ink/25 disabled:shadow-none"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
