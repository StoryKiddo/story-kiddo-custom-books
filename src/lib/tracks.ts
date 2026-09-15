/**
 * Educational track catalog.
 *
 * This is the source of truth for the UI (homepage, track picker, create form).
 * The same eight slugs are seeded in `supabase/migrations/` so the database
 * catalog stays in sync. When you add or rename a track, update both places.
 */

/**
 * Palette for the cut-paper scene drawn behind every theme (tiles, covers,
 * story pages). Four stacked layers — sky, far hill, near hill, accent —
 * plus a `deep` ink dark enough to carry white text on top of it.
 */
export type TrackArt = {
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  accent: string;
  deep: string;
};

export type Track = {
  /** URL-friendly id, also stored on `tracks.slug` in Supabase. */
  slug: string;
  name: string;
  /** Short line shown on cards. */
  tagline: string;
  /** Longer copy used on the create page. */
  description: string;
  ageRange: string;
  /** Pastel used as the book-cover background. */
  cover: string;
  /** Darker ink used for the spine / icon. */
  ink: string;
  /** Colors for the illustrated scene. */
  art: TrackArt;
};

export const TRACKS: Track[] = [
  {
    slug: "alphabet",
    name: "Alphabet",
    tagline: "Letter adventures from A to Z",
    description:
      "A playful story that introduces letters through characters, sounds, and words your child already loves.",
    ageRange: "Ages 2–6",
    cover: "#f6c9b8",
    ink: "#b55b3e",
    art: {
      skyTop: "#ffeadb",
      skyBottom: "#f7c8b2",
      hillFar: "#eeab8c",
      hillNear: "#dc8964",
      accent: "#f0b64b",
      deep: "#8c3f26",
    },
  },
  {
    slug: "numbers",
    name: "Numbers",
    tagline: "Counting through a day of play",
    description:
      "Follow a day of play that weaves in counting, comparing, and everyday number sense — one page at a time.",
    ageRange: "Ages 2–6",
    cover: "#c5dce8",
    ink: "#3d7a8c",
    art: {
      skyTop: "#e6f4fa",
      skyBottom: "#bedbea",
      hillFar: "#92c0d2",
      hillNear: "#5f99b0",
      accent: "#efb964",
      deep: "#275a6b",
    },
  },
  {
    slug: "colors-shapes",
    name: "Colors & Shapes",
    tagline: "Circles, squares, and a world of color",
    description:
      "Hunt for colors and shapes in a story world built around your child — red circles, blue triangles, and more.",
    ageRange: "Ages 2–5",
    cover: "#e3d2f0",
    ink: "#7a4ea3",
    art: {
      skyTop: "#f4eafc",
      skyBottom: "#ddccf0",
      hillFar: "#c0a6df",
      hillNear: "#9977c5",
      accent: "#f2a9c4",
      deep: "#57337a",
    },
  },
  {
    slug: "emotions",
    name: "Emotions",
    tagline: "Big feelings, gentle words",
    description:
      "Name happy, sad, frustrated, and proud in a story that helps your child see feelings as something they can understand.",
    ageRange: "Ages 3–8",
    cover: "#f5d0d8",
    ink: "#b14b63",
    art: {
      skyTop: "#ffe9ee",
      skyBottom: "#f5ccd6",
      hillFar: "#e9a9b7",
      hillNear: "#d17e94",
      accent: "#f3c876",
      deep: "#86324a",
    },
  },
  {
    slug: "kindness-values",
    name: "Kindness & Values",
    tagline: "Sharing, helping, and being a good friend",
    description:
      "Small acts of kindness — sharing, helping, telling the truth — told as an adventure starring your child.",
    ageRange: "Ages 3–8",
    cover: "#cfe5d4",
    ink: "#3f7a52",
    art: {
      skyTop: "#e9f5eb",
      skyBottom: "#c9e2cf",
      hillFar: "#a3ccb0",
      hillNear: "#6da781",
      accent: "#f0b25e",
      deep: "#2c5a3c",
    },
  },
  {
    slug: "life-milestones",
    name: "Life Milestones",
    tagline: "Potty training, first day of school, and other big firsts",
    description:
      "A reassuring story for a big first: potty training, starting school, a new sibling, or sleeping in their own bed.",
    ageRange: "Ages 2–7",
    cover: "#f3ddb0",
    ink: "#b07a1f",
    art: {
      skyTop: "#fef2d6",
      skyBottom: "#f2dbab",
      hillFar: "#e2c07e",
      hillNear: "#c99e4e",
      accent: "#e0774f",
      deep: "#855a14",
    },
  },
  {
    slug: "animals-nature",
    name: "Animals & Nature",
    tagline: "Backyard bugs, forest friends, and curious creatures",
    description:
      "Wander through gardens, woods, and shorelines meeting animals — and picking up a little nature knowledge along the way.",
    ageRange: "Ages 2–8",
    cover: "#d4e4c4",
    ink: "#4f7340",
    art: {
      skyTop: "#eef6e1",
      skyBottom: "#d2e3c0",
      hillFar: "#b0cd95",
      hillNear: "#7da968",
      accent: "#e29a5a",
      deep: "#3b5730",
    },
  },
  {
    slug: "manners",
    name: "Manners",
    tagline: "Please, thank you, and kind hellos",
    description:
      "Practice please, thank you, taking turns, and kind hellos in a story that makes manners feel like a superpower.",
    ageRange: "Ages 3–7",
    cover: "#d5e0f2",
    ink: "#3d5a8a",
    art: {
      skyTop: "#eaf0fc",
      skyBottom: "#cfdcf2",
      hillFar: "#acc1e2",
      hillNear: "#7795c4",
      accent: "#eeb27a",
      deep: "#2b4268",
    },
  },
];

/** Look up a track by its slug. Returns undefined if the slug is unknown. */
export function getTrackBySlug(slug: string | undefined | null): Track | undefined {
  if (!slug) return undefined;
  return TRACKS.find((track) => track.slug === slug);
}
