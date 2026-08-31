/** Canvas helper used by the photo cropper. Browser-only. */

import type { Area } from "react-easy-crop";

const MAX_EDGE = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("We couldn't read that photo. Please try another."));
    image.src = src;
  });
}

function setInputFile(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}

export async function cropImageToFile(
  imageSrc: string,
  pixelCrop: Area,
  originalName: string,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("We couldn't crop that photo. Please try another.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(pixelCrop.width, pixelCrop.height));
  canvas.width = Math.max(1, Math.round(pixelCrop.width * scale));
  canvas.height = Math.max(1, Math.round(pixelCrop.height * scale));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("We couldn't crop that photo. Please try another.")),
      "image/jpeg",
      0.92,
    );
  });

  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}-cropped.jpg`, { type: "image/jpeg" });
}

export function assignFileToInput(input: HTMLInputElement | null, file: File) {
  if (!input) return;
  setInputFile(input, file);
}
