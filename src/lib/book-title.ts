/**
 * Deterministic customer-facing book title and optional subtitle.
 * Built from ordered children + selected track — never from an AI blueprint.
 */

const TRACK_TITLE_LABELS: Record<string, string> = {
  "colors-shapes": "Colors",
  "kindness-values": "Kindness",
  "life-milestones": "Milestones",
  "animals-nature": "Animals",
};

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

function trackTitleWord(track: BookTitleTrack): string {
  return TRACK_TITLE_LABELS[track.slug] ?? track.name;
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
  const titleNames = names.map((name) => name.split(/\s+/)[0]);
  const theme = trackTitleWord(track);

  if (titleNames.length <= 1) {
    return {
      title: `${titleNames[0] ?? "Our"}'s ${theme} Adventure`,
      subtitle: null,
    };
  }

  if (titleNames.length === 2) {
    return {
      title: `${titleNames[0]} & ${titleNames[1]}'s ${theme} Adventure`,
      subtitle: null,
    };
  }

  return {
    title: `Our ${theme} Adventure`,
    subtitle: `Starring ${joinNames(names)}`,
  };
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
