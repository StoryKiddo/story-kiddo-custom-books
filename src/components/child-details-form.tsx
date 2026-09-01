"use client";

/**
 * Collects name, age, photo, interests, and an optional personal note for
 * 1–4 children, plus one book-level story type.
 *
 * Each photo is cropped in the browser first. The cropped file is what the
 * `createOrder` Server Action receives and uploads to Supabase Storage.
 *
 * On failure the form stays mounted: names, ages, notes, story type, and
 * cropped photos remain, with a specific error and a Try again submit.
 */

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { PhotoCropField } from "@/components/photo-crop-field";
import {
  CREATE_ORDER_MESSAGES,
  isPayloadOverActionLimit,
  isPhotoOverSizeLimit,
} from "@/lib/create-order-errors";
import { createOrder, type CreateOrderState } from "@/lib/actions/create-order";
import { MAX_CHILDREN_PER_BOOK } from "@/lib/orders";
import {
  CUSTOM_INTEREST_PLACEHOLDER,
  DEFAULT_STORY_TYPE,
  INTERESTS,
  MAX_CUSTOM_INTEREST_CHARS,
  MAX_INTERESTS,
  MAX_PERSONAL_NOTE_CHARS,
  PERSONAL_NOTE_PLACEHOLDER,
  STORY_TYPES,
  type InterestId,
  type StoryTypeId,
} from "@/lib/personalization";
import type { Track } from "@/lib/tracks";

type ChildDraft = {
  id: string;
  name: string;
  age: string;
  customInterest: string;
  personalNote: string;
  interestIds: InterestId[];
  showCustomInterest: boolean;
};

function emptyChild(id: string): ChildDraft {
  return {
    id,
    name: "",
    age: "",
    customInterest: "",
    personalNote: "",
    interestIds: [],
    showCustomInterest: false,
  };
}

export function ChildDetailsForm({ track }: { track: Track }) {
  const [state, formAction, pending] = useActionState<CreateOrderState, FormData>(
    createOrder,
    null,
  );
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild("1")]);
  const [nextId, setNextId] = useState(2);
  const [storyType, setStoryType] = useState<StoryTypeId>(DEFAULT_STORY_TYPE);
  const [clientError, setClientError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const errorMessage = clientError ?? state?.error ?? null;

  useEffect(() => {
    if (!errorMessage) return;
    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [errorMessage]);

  function addChild() {
    if (children.length >= MAX_CHILDREN_PER_BOOK) return;
    setChildren((current) => [...current, emptyChild(String(nextId))]);
    setNextId((value) => value + 1);
  }

  function removeChild(id: string) {
    if (children.length <= 1) return;
    setChildren((current) => current.filter((child) => child.id !== id));
  }

  function patchChild(id: string, patch: Partial<ChildDraft>) {
    setChildren((current) =>
      current.map((child) => (child.id === id ? { ...child, ...patch } : child)),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const photos = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="photo"]'),
    );
    const files = photos
      .map((input) => input.files?.[0])
      .filter((file): file is File => Boolean(file && file.size > 0));

    if (children.some((child) => child.name.trim().length < 1 || child.name.trim().length > 40)) {
      setClientError(CREATE_ORDER_MESSAGES.nameInvalid);
      return;
    }

    if (
      children.some((child) => {
        const age = Number.parseInt(child.age, 10);
        return !Number.isInteger(age) || age < 0 || age > 12;
      })
    ) {
      setClientError(CREATE_ORDER_MESSAGES.ageInvalid);
      return;
    }

    if (files.length !== children.length) {
      setClientError(CREATE_ORDER_MESSAGES.photoMissing);
      return;
    }

    if (files.some((file) => isPhotoOverSizeLimit(file.size))) {
      setClientError(CREATE_ORDER_MESSAGES.photoTooLarge);
      return;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (isPayloadOverActionLimit(totalBytes)) {
      setClientError(CREATE_ORDER_MESSAGES.payloadTooLarge);
      return;
    }

    const formData = new FormData();
    formData.set("track", track.slug);
    formData.set("storyType", storyType);
    children.forEach((child, index) => {
      formData.append("childName", child.name.trim());
      formData.append("childAge", child.age.trim());
      formData.append(
        "customInterest",
        child.showCustomInterest ? child.customInterest : "",
      );
      formData.append("personalNote", child.personalNote);
      for (const interestId of child.interestIds) {
        formData.append(`interests-${index}`, interestId);
      }
    });
    for (const file of files) {
      formData.append("photo", file);
    }

    setClientError(null);
    formAction(formData);
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-busy={pending}
      className="space-y-8"
    >
      <input type="hidden" name="track" value={track.slug} />
      <input type="hidden" name="storyType" value={storyType} />

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
            onPatch={(patch) => patchChild(child.id, patch)}
            onToggleInterest={(interestId) => {
              const selected = child.interestIds.includes(interestId);
              if (selected) {
                patchChild(child.id, {
                  interestIds: child.interestIds.filter((id) => id !== interestId),
                });
                return;
              }
              if (child.interestIds.length >= MAX_INTERESTS) return;
              patchChild(child.id, { interestIds: [...child.interestIds, interestId] });
            }}
            onToggleCustom={() =>
              patchChild(child.id, { showCustomInterest: !child.showCustomInterest })
            }
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

      <fieldset className="space-y-3">
        <legend className="font-display text-lg text-ink">What kind of story?</legend>
        <p className="text-sm text-ink-soft">
          Pick one style for the whole book. We&apos;ll still write it at the youngest
          child&apos;s reading level.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STORY_TYPES.map((type) => {
            const selected = storyType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setStoryType(type.id)}
                aria-pressed={selected}
                disabled={pending}
                className={[
                  "rounded-3xl border bg-white/60 p-4 text-left transition",
                  selected
                    ? "border-ink ring-2 ring-ink/15"
                    : "border-rule hover:border-ink/25",
                ].join(" ")}
              >
                <span className="block font-display text-lg text-ink">{type.name}</span>
                <span className="mt-1 block text-sm text-ink-soft">{type.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {errorMessage ? (
        <div
          ref={errorRef}
          className="space-y-3 rounded-2xl bg-[#f5d0d8] px-4 py-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-semibold text-[#7a2d3d]">{errorMessage}</p>
          <p className="text-xs text-[#7a2d3d]/80">
            Your details and photos are still here. You can fix anything that needs
            it, then try again.
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        id="create-book-submit"
        disabled={pending}
        className="rounded-full bg-coral px-8 py-3 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_20px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Saving your book…" : errorMessage ? "Try again" : "Create this book"}
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
  onPatch,
  onToggleInterest,
  onToggleCustom,
}: {
  child: ChildDraft;
  index: number;
  total: number;
  track: Track;
  pending: boolean;
  onRemove: () => void;
  onPatch: (patch: Partial<ChildDraft>) => void;
  onToggleInterest: (id: InterestId) => void;
  onToggleCustom: () => void;
}) {
  const headingId = `child-heading-${child.id}`;
  const label = total === 1 ? "Your child" : `Child ${index + 1}`;
  const atInterestLimit = child.interestIds.length >= MAX_INTERESTS;

  return (
    <fieldset
      aria-labelledby={headingId}
      className="rounded-3xl border border-rule bg-white/60 p-5 sm:p-6"
    >
      {child.interestIds.map((id) => (
        <input key={id} type="hidden" name={`interests-${index}`} value={id} />
      ))}

      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-display text-lg text-ink">
          {label}
        </h3>
        {total > 1 ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            className="text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink disabled:opacity-70"
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
            placeholder="Dylan"
            value={child.name}
            onChange={(event) => onPatch({ name: event.target.value })}
            onInput={(event) => onPatch({ name: event.currentTarget.value })}
            className="w-full rounded-2xl border border-rule bg-cream px-4 py-3 text-ink outline-none ring-coral/30 placeholder:text-ink-soft focus:ring-2"
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
            value={child.age}
            onChange={(event) => onPatch({ age: event.target.value })}
            onInput={(event) => onPatch({ age: event.currentTarget.value })}
            className="w-full rounded-2xl border border-rule bg-cream px-4 py-3 text-ink outline-none ring-coral/30 placeholder:text-ink-soft focus:ring-2"
          />
          {index === 0 ? (
            <span className="block text-xs text-ink-soft">
              Whole years, from 0 to 12. {track.ageRange} is the sweet spot for this theme.
            </span>
          ) : null}
        </label>
      </div>

      <PhotoCropField id={child.id} label={label} pending={pending} />

      <div className="mt-6 space-y-3">
        <p className="text-sm font-semibold text-ink">What do they love?</p>
        <p className="text-xs text-ink-soft">
          Pick up to {MAX_INTERESTS}. We&apos;ll use one as the world of the story — not all of them at once.
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const selected = child.interestIds.includes(interest.id);
            const disabled = pending || (!selected && atInterestLimit);
            return (
              <button
                key={interest.id}
                type="button"
                onClick={() => onToggleInterest(interest.id)}
                aria-pressed={selected}
                disabled={disabled}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  selected
                    ? "border-ink bg-ink text-cream"
                    : "border-rule bg-cream text-ink hover:border-ink/30",
                  disabled && !selected ? "opacity-50" : "",
                ].join(" ")}
              >
                {interest.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onToggleCustom}
            aria-pressed={child.showCustomInterest}
            disabled={pending}
            className={[
              "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
              child.showCustomInterest
                ? "border-ink bg-ink text-cream"
                : "border-dashed border-ink/25 bg-cream text-ink hover:border-ink/40",
            ].join(" ")}
          >
            + Something else
          </button>
        </div>
        {child.showCustomInterest ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Something else</span>
            <input
              name="customInterest"
              type="text"
              maxLength={MAX_CUSTOM_INTEREST_CHARS}
              placeholder={CUSTOM_INTEREST_PLACEHOLDER}
              value={child.customInterest}
              onChange={(event) => onPatch({ customInterest: event.target.value })}
              onInput={(event) => onPatch({ customInterest: event.currentTarget.value })}
              className="w-full rounded-2xl border border-rule bg-cream px-4 py-3 text-ink outline-none ring-coral/30 placeholder:text-ink-soft focus:ring-2"
            />
          </label>
        ) : (
          <input type="hidden" name="customInterest" value="" />
        )}
      </div>

      <label className="mt-6 block space-y-2">
        <span className="text-sm font-semibold text-ink">Anything we should know?</span>
        <span className="block text-xs text-ink-soft">
          Optional. A favorite toy, a habit, a person, or a little detail we can tuck into the story.
        </span>
        <textarea
          name="personalNote"
          rows={3}
          maxLength={MAX_PERSONAL_NOTE_CHARS}
          placeholder={PERSONAL_NOTE_PLACEHOLDER}
          value={child.personalNote}
          onChange={(event) => onPatch({ personalNote: event.target.value })}
          onInput={(event) => onPatch({ personalNote: event.currentTarget.value })}
          className="w-full rounded-2xl border border-rule bg-cream px-4 py-3 text-ink outline-none ring-coral/30 placeholder:text-ink-soft focus:ring-2"
        />
      </label>
    </fieldset>
  );
}
