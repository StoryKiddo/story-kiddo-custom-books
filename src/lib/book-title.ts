/**
 * Deterministic customer-facing book title and optional subtitle.
 * Built from ordered children + selected track — never from an AI blueprint.
 */

/**
 * The second half of a cover title, per theme. Titles read the way a published
 * picture book does — "Mia and the Great Alphabet Quest" — because the cover
 * lettering is set in three parts: the name, a small "and the", then this.
 */
const TRACK_TITLE_PHRASES: Record<string, string> = {
  alphabet: "Great Alphabet Quest",
  numbers: "Counting Carnival",
  "colors-shapes": "Rainbow Shape Parade",
  emotions: "Big Feelings Forecast",
  "kindness-values": "Lantern of Kindness",
  "life-milestones": "Very Big First",
  "animals-nature": "Wild Woodland Wander",
  manners: "Magic Little Words",
};

const TITLE_CONNECTOR = "and the";

export const DEFAULT_DEDICATION_GIVER = "Mom and Dad";

export type BookTitleChild = {
  name: string;
};

export type BylineChild = BookTitleChild & {
  age: number;
};

export type BookTitleTrack = {
  slug: string;
  name: string;
};

export type PersonalizedBookCopy = {
  title: string;
  subtitle: string | null;
};

function trimmedNames(children: BookTitleChild[]): string[] {
  return children.map((child) => child.name.trim());
}

function trackTitlePhrase(track: BookTitleTrack): string {
  return TRACK_TITLE_PHRASES[track.slug] ?? `${track.name} Adventure`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export function personalizedBookCopy(
  children: BookTitleChild[],
  track: BookTitleTrack,
): PersonalizedBookCopy {
  const names = trimmedNames(children);
  const titleNames = names.map((name) => name.split(/\s+/)[0]).filter(Boolean);
  const phrase = trackTitlePhrase(track);

  if (titleNames.length === 0) {
    return { title: `The ${phrase}`, subtitle: null };
  }

  if (titleNames.length <= 2) {
    return {
      title: `${joinNames(titleNames)} ${TITLE_CONNECTOR} ${phrase}`,
      subtitle: null,
    };
  }

  return {
    title: `The ${phrase}`,
    subtitle: `Starring ${joinNames(names)}`,
  };
}

export type CoverLockup = {
  /** The big first line — usually the child's name. Null when the title has no connector. */
  lead: string | null;
  /** The small middle line, e.g. "and the". */
  connector: string | null;
  /** The second big line. */
  rest: string;
};

/**
 * Splits a title into the three lines a cover is lettered in. The cover art
 * generator and the image prompt both use this so the printed lockup and the
 * prompt describe the same thing.
 */
export function coverLockup(title: string): CoverLockup {
  const clean = title.trim().replace(/\s+/g, " ");
  const marker = ` ${TITLE_CONNECTOR} `;
  const index = clean.toLowerCase().indexOf(marker);

  if (index > 0) {
    const lead = clean.slice(0, index).trim();
    const rest = clean.slice(index + marker.length).trim();
    if (lead && rest) {
      return { lead, connector: TITLE_CONNECTOR, rest };
    }
  }

  return { lead: null, connector: null, rest: clean };
}

/** The small line printed at the bottom of a cover, under the picture. */
export function dedicationLine(giver?: string | null): string {
  const clean = (giver ?? "").trim().replace(/\s+/g, " ");
  const from = clean.length > 0 ? clean : DEFAULT_DEDICATION_GIVER;
  return /^from\b/i.test(from) ? from : `From ${from}`;
}

/**
 * The small "starring" line printed under a cover title. Returns null for three
 * or more children, where the same names already appear as the subtitle.
 */
export function coverByline(children: BylineChild[]): string | null {
  const names = trimmedNames(children).filter((name) => name.length > 0);
  if (names.length === 1) {
    return `Starring ${names[0]}, age ${children[0].age}`;
  }
  if (names.length === 2) {
    return `Starring ${joinNames(names)}`;
  }
  return null;
}
