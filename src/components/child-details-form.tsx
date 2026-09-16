"use client";

/**
 * The guided order flow: one decision per screen, with a visible step
 * indicator and back navigation.
 *
 * Every step stays mounted and is hidden rather than unmounted, so cropped
 * photos and typed answers survive moving back and forth — and the whole form
 * still submits as one FormData to the `createOrder` Server Action.
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
import { DEFAULT_DEDICATION_GIVER, dedicationLine } from "@/lib/book-title";
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

const STEPS = [
  { id: "children", label: "Who it's for" },
  { id: "photos", label: "Photo" },
  { id: "interests", label: "What they love" },
  { id: "story", label: "Story style" },
  { id: "gift", label: "Who it's from" },
] as const;

const LAST_STEP = STEPS.length - 1;

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

/** "Charlize", "Charlize and Sam", "Charlize, Sam and Alex". */
function namesSentence(children: ChildDraft[], fallback = "your child"): string {
  const names = children.map((child) => child.name.trim()).filter(Boolean);
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function ChildDetailsForm({ track }: { track: Track }) {
  const [state, formAction, pending] = useActionState<CreateOrderState, FormData>(
    createOrder,
    null,
  );
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild("1")]);
  const [nextId, setNextId] = useState(2);
  const [storyType, setStoryType] = useState<StoryTypeId>(DEFAULT_STORY_TYPE);
  const [giver, setGiver] = useState("");
  const [step, setStep] = useState(0);
  const [clientError, setClientError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  const errorMessage = clientError ?? state?.error ?? null;
  const who = namesSentence(children);

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

  function croppedPhotos(): File[] {
    const inputs = Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>('input[name="photo"]') ?? [],
    );
    return inputs
      .map((input) => input.files?.[0])
      .filter((file): file is File => Boolean(file && file.size > 0));
  }

  /** The problem with the current step, or null when it is good to go. */
  function problemWithStep(index: number): string | null {
    if (index === 0) {
      if (children.some((child) => child.name.trim().length < 1 || child.name.trim().length > 40)) {
        return CREATE_ORDER_MESSAGES.nameInvalid;
      }
      if (
        children.some((child) => {
          const age = Number.parseInt(child.age, 10);
          return !Number.isInteger(age) || age < 0 || age > 12;
        })
      ) {
        return CREATE_ORDER_MESSAGES.ageInvalid;
      }
      return null;
    }

    if (index === 1) {
      const files = croppedPhotos();
      if (files.length !== children.length) return CREATE_ORDER_MESSAGES.photoMissing;
      if (files.some((file) => isPhotoOverSizeLimit(file.size))) {
        return CREATE_ORDER_MESSAGES.photoTooLarge;
      }
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (isPayloadOverActionLimit(totalBytes)) return CREATE_ORDER_MESSAGES.payloadTooLarge;
      return null;
    }

    return null;
  }

  function goTo(index: number) {
    setStep(index);
    setClientError(null);
    window.requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function onNext() {
    const problem = problemWithStep(step);
    if (problem) {
      setClientError(problem);
      return;
    }
    goTo(Math.min(step + 1, LAST_STEP));
  }

  /**
   * The primary button is never a submit button. React reuses one DOM node for
   * "Continue" and "Create this book", so a submit type would still be pressed
   * when `onNext` swapped it mid-click and would post the order a step early.
   */
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === LAST_STEP) submitOrder();
    else onNext();
  }

  function submitOrder() {
    for (let index = 0; index <= LAST_STEP; index++) {
      const problem = problemWithStep(index);
      if (problem) {
        setClientError(problem);
        setStep(index);
        return;
      }
    }

    const formData = new FormData();
    formData.set("track", track.slug);
    formData.set("storyType", storyType);
    formData.set("giver", giver.trim());
    children.forEach((child, index) => {
      formData.append("childName", child.name.trim());
      formData.append("childAge", child.age.trim());
      formData.append("customInterest", child.showCustomInterest ? child.customInterest : "");
      formData.append("personalNote", child.personalNote);
      for (const interestId of child.interestIds) {
        formData.append(`interests-${index}`, interestId);
      }
    });
    for (const file of croppedPhotos()) {
      formData.append("photo", file);
    }

    setClientError(null);
    formAction(formData);
  }

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} aria-busy={pending} className="space-y-8">
      <input type="hidden" name="track" value={track.slug} />
      <input type="hidden" name="storyType" value={storyType} />
      <input type="hidden" name="giver" value={giver} />

      <StepProgress step={step} track={track} onJumpBack={goTo} />

      <div>
        <p
          ref={headingRef}
          className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ink-soft"
        >
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-2 text-[1.75rem] leading-tight tracking-tight text-ink sm:text-[2.1rem]">
          {step === 0
            ? "Who is this book for?"
            : step === 1
              ? `A photo of ${who}`
              : step === 2
                ? `What does ${who} love?`
                : step === 3
                  ? "What kind of story?"
                  : "Who is it from?"}
        </h2>
        <p className="mt-2 max-w-prose text-ink-soft">
          {step === 0
            ? "Their name is lettered into the cover art, so spell it the way they do."
            : step === 1
              ? "One clear photo of their face. We draw from it — it is never printed in the book."
              : step === 2
                ? "We build the world of the story around one of these, not all of them at once."
                : step === 3
                  ? `One style for the whole book. We'll still write it at ${
                      children.length > 1 ? "the youngest child's" : "their"
                    } reading level.`
                  : "This line is painted onto the bottom of the cover, under the picture."}
        </p>
      </div>

      <StepPanel active={step === 0}>
        <div className="space-y-5">
          {children.map((child, index) => (
            <NameAndAge
              key={child.id}
              child={child}
              index={index}
              total={children.length}
              track={track}
              pending={pending}
              onRemove={() => removeChild(child.id)}
              onPatch={(patch) => patchChild(child.id, patch)}
            />
          ))}
        </div>
        {children.length < MAX_CHILDREN_PER_BOOK ? (
          <button
            type="button"
            onClick={addChild}
            disabled={pending}
            className="mt-5 rounded-full border border-ink/12 bg-cream/80 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream disabled:opacity-70"
          >
            Add another child
          </button>
        ) : (
          <p className="mt-5 text-sm text-ink-soft">Four children is the maximum for one book.</p>
        )}
      </StepPanel>

      {/* Photo inputs stay mounted on every step so crops are never lost. */}
      <StepPanel active={step === 1}>
        <div className="space-y-6">
          {children.map((child, index) => (
            <div
              key={child.id}
              className="rounded-[26px] border border-rule bg-white/60 p-5 sm:p-6"
            >
              <p className="mb-3 font-display text-lg font-bold text-ink">
                {child.name.trim() || `Child ${index + 1}`}
              </p>
              <PhotoCropField
                id={child.id}
                label={child.name.trim() || `Child ${index + 1}`}
                pending={pending}
              />
            </div>
          ))}
        </div>
      </StepPanel>

      <StepPanel active={step === 2}>
        <div className="space-y-6">
          {children.map((child, index) => (
            <InterestsCard
              key={child.id}
              child={child}
              index={index}
              total={children.length}
              pending={pending}
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
      </StepPanel>

      <StepPanel active={step === 3}>
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
                  "group relative overflow-hidden rounded-[22px] p-5 pl-6 text-left transition",
                  selected
                    ? "bg-white shadow-[0_0_0_2px_var(--ink),0_10px_18px_-14px_rgba(36,28,22,0.6)]"
                    : "bg-white/55 shadow-[0_0_0_1px_var(--rule)] hover:bg-white/80 hover:shadow-[0_0_0_1px_rgba(36,28,22,0.25)]",
                ].join(" ")}
                style={{ borderLeft: `6px solid ${selected ? track.art.deep : track.art.hillFar}` }}
              >
                <span className="block font-display text-lg font-bold text-ink">{type.name}</span>
                <span className="mt-1 block text-sm text-ink-soft">{type.description}</span>
                <span
                  aria-hidden="true"
                  className="absolute -right-6 -top-6 h-16 w-16 rounded-full transition group-hover:scale-110"
                  style={{
                    background: selected ? track.art.accent : track.art.skyBottom,
                    opacity: selected ? 0.55 : 0.4,
                  }}
                />
              </button>
            );
          })}
        </div>
      </StepPanel>

      <StepPanel active={step === LAST_STEP}>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">The gift is from</span>
          <input
            type="text"
            maxLength={40}
            placeholder={DEFAULT_DEDICATION_GIVER}
            value={giver}
            onChange={(event) => setGiver(event.target.value)}
            disabled={pending}
            className="w-full rounded-2xl border border-rule bg-cream px-4 py-3 text-ink outline-none ring-coral/30 placeholder:text-ink-soft focus:ring-2"
          />
        </label>
        <p className="mt-3 text-sm text-ink-soft">
          It will read{" "}
          <span className="font-semibold text-ink">{dedicationLine(giver)}</span> on the
          cover. Leave it blank for {dedicationLine("")}.
        </p>

        <dl className="mt-7 space-y-3 rounded-[22px] border border-rule bg-white/55 p-5 text-sm">
          <SummaryRow label="Theme" value={track.name} onEdit={null} />
          <SummaryRow
            label={children.length > 1 ? "Children" : "Child"}
            value={children
              .map((child) => `${child.name.trim() || "—"}${child.age ? `, age ${child.age}` : ""}`)
              .join(" · ")}
            onEdit={() => goTo(0)}
          />
          <SummaryRow
            label="Story style"
            value={STORY_TYPES.find((type) => type.id === storyType)?.name ?? ""}
            onEdit={() => goTo(3)}
          />
        </dl>
      </StepPanel>

      {errorMessage ? (
        <div
          ref={errorRef}
          className="space-y-3 rounded-2xl bg-[#f5d0d8] px-4 py-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-semibold text-[#7a2d3d]">{errorMessage}</p>
          <p className="text-xs text-[#7a2d3d]/80">
            Your details and photos are still here. You can fix anything that needs it,
            then try again.
          </p>
        </div>
      ) : null}

      <div className="space-y-4 border-t border-rule pt-6">
        <button
          type="button"
          id="create-book-submit"
          onClick={step === LAST_STEP ? submitOrder : onNext}
          disabled={pending}
          className="w-full rounded-full bg-coral px-8 py-4 text-base font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_12px_22px_-10px_rgba(171,71,40,0.8)] transition hover:bg-coral-dark disabled:cursor-wait disabled:opacity-70"
        >
          {step < LAST_STEP
            ? "Continue"
            : pending
              ? "Making your book…"
              : errorMessage
                ? "Try again"
                : "Create this book"}
        </button>

        <p className="flex items-center justify-center gap-2 text-center text-sm text-ink-soft">
          <ShieldMark />
          Preview and edit your book before it prints.
        </p>

        {step > 0 ? (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={pending}
            className="mx-auto block text-sm font-semibold text-ink-soft underline decoration-ink/20 underline-offset-4 transition hover:text-ink disabled:opacity-70"
          >
            Back to {STEPS[step - 1].label.toLowerCase()}
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** Keeps a step in the DOM (so its inputs keep their values) while hiding it. */
function StepPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div hidden={!active} aria-hidden={!active}>
      {children}
    </div>
  );
}

function StepProgress({
  step,
  track,
  onJumpBack,
}: {
  step: number;
  track: Track;
  onJumpBack: (index: number) => void;
}) {
  const percent = ((step + 1) / STEPS.length) * 100;

  return (
    <div>
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
        {STEPS.map((item, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={item.id}>
              {done ? (
                <button
                  type="button"
                  onClick={() => onJumpBack(index)}
                  className="text-ink-soft underline decoration-ink/20 underline-offset-4 transition hover:text-ink"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  aria-current={current ? "step" : undefined}
                  className={current ? "text-ink" : "text-ink-soft/55"}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, background: track.art.deep }}
        />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: (() => void) | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 font-semibold text-ink-soft">{label}</dt>
      <dd className="flex items-baseline gap-3 text-right text-ink">
        <span>{value}</span>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-xs font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Change
          </button>
        ) : null}
      </dd>
    </div>
  );
}

function NameAndAge({
  child,
  index,
  total,
  track,
  pending,
  onRemove,
  onPatch,
}: {
  child: ChildDraft;
  index: number;
  total: number;
  track: Track;
  pending: boolean;
  onRemove: () => void;
  onPatch: (patch: Partial<ChildDraft>) => void;
}) {
  const headingId = `child-heading-${child.id}`;
  const label = total === 1 ? "Your child" : `Child ${index + 1}`;

  return (
    <fieldset
      aria-labelledby={headingId}
      className="rounded-[26px] border border-rule bg-white/60 p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-display text-lg font-bold text-ink">
          {child.name.trim() || label}
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
    </fieldset>
  );
}

function InterestsCard({
  child,
  index,
  total,
  pending,
  onPatch,
  onToggleInterest,
  onToggleCustom,
}: {
  child: ChildDraft;
  index: number;
  total: number;
  pending: boolean;
  onPatch: (patch: Partial<ChildDraft>) => void;
  onToggleInterest: (id: InterestId) => void;
  onToggleCustom: () => void;
}) {
  const atInterestLimit = child.interestIds.length >= MAX_INTERESTS;
  const label = child.name.trim() || (total === 1 ? "Your child" : `Child ${index + 1}`);

  return (
    <fieldset className="rounded-[26px] border border-rule bg-white/60 p-5 sm:p-6">
      {child.interestIds.map((id) => (
        <input key={id} type="hidden" name={`interests-${index}`} value={id} />
      ))}

      <legend className="px-1 font-display text-lg font-bold text-ink">{label}</legend>

      <p className="mt-2 text-xs text-ink-soft">
        Pick up to {MAX_INTERESTS}. We&apos;ll use one as the world of the story — not all
        of them at once.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
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
        <label className="mt-4 block space-y-2">
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

      <label className="mt-6 block space-y-2">
        <span className="text-sm font-semibold text-ink">Anything we should know?</span>
        <span className="block text-xs text-ink-soft">
          Optional. A favorite toy, a habit, a person, or a little detail we can tuck into
          the story.
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

function ShieldMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-sage">
      <path
        d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5V6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 12.2l2.2 2.2 4.2-4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
