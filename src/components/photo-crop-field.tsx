"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  CREATE_ORDER_MESSAGES,
  MAX_PHOTO_MB,
  isAllowedPhotoType,
  isPhotoOverSizeLimit,
} from "@/lib/create-order-errors";
import { assignFileToInput, cropImageToFile } from "@/lib/crop-image";

const CROP_ASPECT = 4 / 5;

type PhotoCropFieldProps = {
  id: string;
  label: string;
  pending: boolean;
};

export function PhotoCropField({ id, label, pending }: PhotoCropFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLInputElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileNameRef = useRef<string | null>(null);
  const lastAreaRef = useRef<Area | null>(null);
  const applySeqRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const croppedFileRef = useRef<File | null>(null);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropError, setCropError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function restoreCroppedFile() {
    if (!croppedFileRef.current) return;
    assignFileToInput(submitRef.current, croppedFileRef.current);
  }

  // Browsers clear <input type="file"> after submit. Put the cropped File
  // back before FormData is built so Try again can resubmit the same photo.
  useEffect(() => {
    const form = submitRef.current?.form;
    if (!form) return;

    function onSubmitCapture() {
      restoreCroppedFile();
    }

    form.addEventListener("submit", onSubmitCapture, true);
    return () => form.removeEventListener("submit", onSubmitCapture, true);
  }, []);

  useEffect(() => {
    if (pending) return;
    restoreCroppedFile();
  }, [pending]);

  function replaceSourceUrl(next: string | null) {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    sourceUrlRef.current = next;
    setSourceUrl(next);
  }

  function replacePreviewUrl(next: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next;
    setPreviewUrl(next);
  }

  function clearSubmitFile() {
    if (!submitRef.current) return;
    submitRef.current.value = "";
    const transfer = new DataTransfer();
    submitRef.current.files = transfer.files;
  }

  function resetPhoto() {
    applySeqRef.current += 1;
    lastAreaRef.current = null;
    replaceSourceUrl(null);
    replacePreviewUrl(null);
    fileNameRef.current = null;
    setFileName(null);
    setCropping(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropError(null);
    croppedFileRef.current = null;
    if (pickerRef.current) pickerRef.current.value = "";
    clearSubmitFile();
  }

  function openPicker() {
    if (pickerRef.current) pickerRef.current.value = "";
    pickerRef.current?.click();
  }

  function onPick(file: File | undefined) {
    if (!file) {
      resetPhoto();
      return;
    }
    if (!isAllowedPhotoType(file.type)) {
      setCropError(CREATE_ORDER_MESSAGES.photoType);
      return;
    }
    if (isPhotoOverSizeLimit(file.size)) {
      setCropError(CREATE_ORDER_MESSAGES.photoTooLarge);
      return;
    }

    applySeqRef.current += 1;
    lastAreaRef.current = null;
    croppedFileRef.current = null;
    replacePreviewUrl(null);
    clearSubmitFile();
    replaceSourceUrl(URL.createObjectURL(file));
    fileNameRef.current = file.name;
    setFileName(file.name);
    setCropping(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropError(null);
  }

  async function applyCrop(area: Area) {
    const src = sourceUrlRef.current;
    if (!src || area.width < 8 || area.height < 8) return;
    const seq = ++applySeqRef.current;
    try {
      const cropped = await cropImageToFile(src, area, fileNameRef.current ?? "photo.jpg");
      if (seq !== applySeqRef.current) return;
      croppedFileRef.current = cropped;
      assignFileToInput(submitRef.current, cropped);
      replacePreviewUrl(URL.createObjectURL(cropped));
      setCropError(null);
    } catch (error) {
      if (seq !== applySeqRef.current) return;
      setCropError(error instanceof Error ? error.message : "We couldn't crop that photo.");
    }
  }

  function scheduleApply(area: Area) {
    lastAreaRef.current = area;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void applyCrop(area);
    }, 80);
  }

  return (
    <div className="mt-6 space-y-2">
      <label htmlFor={`photo-picker-${id}`} className="text-sm font-semibold text-ink">
        Photo of your child
      </label>
      <p className="text-sm leading-relaxed text-ink-soft">
        For the best results: use a clear, well-lit photo with your child&apos;s
        whole face visible. Face the camera if you can. Skip sunglasses, hats
        that hide the hairline, or photos with other people in the frame.
      </p>
      <p className="text-xs text-ink-soft">
        JPG, PNG, or WebP, up to {MAX_PHOTO_MB} MB. You can crop after you upload.
      </p>

      <input
        id={`photo-picker-${id}`}
        ref={pickerRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => onPick(event.target.files?.[0])}
      />
      <input
        ref={submitRef}
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        data-cropped={previewUrl ? "true" : "false"}
        tabIndex={-1}
      />

      {!sourceUrl ? (
        <button
          type="button"
          disabled={pending}
          onClick={openPicker}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (!file) return;
            onPick(file);
          }}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink/20 bg-cream/70 px-6 py-10 text-center transition hover:border-coral hover:bg-cream"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-deep text-2xl text-ink-soft">
            +
          </span>
          <span className="text-sm font-semibold text-ink">
            Drop a photo here, or click to browse
          </span>
        </button>
      ) : null}

      {sourceUrl && cropping ? (
        <div className="space-y-4 rounded-3xl border border-rule bg-cream/70 p-4 sm:p-5">
          <p className="text-sm font-semibold text-ink">
            Drag to frame {label.toLowerCase()}&apos;s face
          </p>
          <div className="relative h-72 w-full touch-none overflow-hidden rounded-3xl bg-paper-deep sm:h-80">
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={CROP_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => scheduleApply(pixels)}
              objectFit="contain"
              showGrid
            />
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-ink-soft">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-coral"
            />
          </label>
          {previewUrl ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`Cropped preview for ${label.toLowerCase()}`}
                className="h-24 w-[4.8rem] rounded-2xl object-cover shadow-[0_12px_24px_-12px_rgba(36,28,22,0.28)]"
              />
              <p className="text-sm text-ink-soft">This cropped photo is what we&apos;ll use for the illustrations.</p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">A live preview appears as you adjust the frame.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (previewUrl) setCropping(false);
              }}
              disabled={!previewUrl}
              className="rounded-full bg-coral px-6 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_16px_-8px_rgba(181,78,53,0.7)] transition hover:bg-coral-dark disabled:opacity-60"
            >
              Use this photo
            </button>
            <button
              type="button"
              onClick={openPicker}
              className="rounded-full border border-ink/12 bg-cream/80 px-6 py-2.5 text-sm font-semibold text-ink"
            >
              Choose a different photo
            </button>
          </div>
        </div>
      ) : null}

      {sourceUrl && !cropping && previewUrl ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={openPicker}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink/20 bg-cream/70 px-6 py-8 text-center transition hover:border-coral hover:bg-cream"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Cropped photo of ${label.toLowerCase()}`}
              className="h-40 w-32 rounded-3xl object-cover shadow-[0_12px_24px_-12px_rgba(36,28,22,0.28)]"
            />
            <span className="text-sm font-semibold text-ink">
              {fileName ? `${fileName} · cropped` : "Cropped photo ready"}
            </span>
          </button>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCropping(true)}
              className="text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Adjust crop
            </button>
            <button
              type="button"
              onClick={openPicker}
              className="text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Choose a different photo
            </button>
          </div>
        </div>
      ) : null}

      {cropError ? (
        <p className="text-sm font-semibold text-[#7a2d3d]" role="alert">
          {cropError}
        </p>
      ) : null}
    </div>
  );
}
