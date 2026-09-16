/**
 * Tiny color helper for the illustrated UI: theme colors live in
 * `src/lib/tracks.ts` as hex, but scrims over artwork need the same hue at a
 * chosen opacity.
 */

/** `#b55b3e` + 0.6 -> `rgba(181, 91, 62, 0.6)`. Unparseable input falls back to warm ink. */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return `rgba(36, 28, 22, ${clamped})`;
  }

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
