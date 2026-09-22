/**
 * The panel a page's words are set in.
 *
 * Each theme gets a container that belongs to its own picture — a parchment
 * scroll, a cloud, a painted wooden sign, or a tipped-in paper card. The panel
 * art is split into a stretching body and fixed end caps, so the panel grows
 * with the words instead of the words spilling out of it.
 */

import { withAlpha } from "@/lib/color";
import { isLaunchTrack, type Track } from "@/lib/tracks";

export type PanelKind = "scroll" | "cloud" | "sign" | "paper";

const PANEL_BY_TRACK: Record<string, PanelKind> = {
  alphabet: "scroll",
  numbers: "paper",
  "colors-shapes": "paper",
  emotions: "cloud",
  "kindness-values": "scroll",
  "life-milestones": "sign",
  "animals-nature": "sign",
  manners: "cloud",
};

export function panelKindFor(slug: string): PanelKind {
  return PANEL_BY_TRACK[slug] ?? "paper";
}

type PanelTrack = Pick<Track, "slug" | "art">;

const PAPER = "#fdf3e0";
const PAPER_DEEP = "#f2e2c6";

export function StoryPanel({
  track,
  children,
  kind,
}: {
  track: PanelTrack;
  children: React.ReactNode;
  kind?: PanelKind;
}) {
  if (isLaunchTrack(track.slug)) {
    return <ParchmentPanel>{children}</ParchmentPanel>;
  }

  const panel = kind ?? panelKindFor(track.slug);
  const { deep, accent } = track.art;
  const capHeight = panel === "cloud" ? 56 : panel === "sign" ? 30 : 34;

  return (
    <div className="relative mx-auto w-full max-w-[42rem]">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ filter: `drop-shadow(0 16px 22px ${withAlpha(deep, 0.38)})` }}
      >
        <PanelBody panel={panel} deep={deep} accent={accent} capHeight={capHeight} />
      </div>

      <div
        className="relative px-7 sm:px-12"
        style={{
          paddingTop: panel === "cloud" ? 64 : panel === "sign" ? 44 : 52,
          paddingBottom: panel === "cloud" ? 64 : panel === "sign" ? 44 : 52,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ParchmentPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[46rem]">
      <div className="story-parchment relative">
        <div className="relative px-1 py-2 sm:px-2 sm:py-3">{children}</div>
      </div>
    </div>
  );
}

function PanelBody({
  panel,
  deep,
  accent,
  capHeight,
}: {
  panel: PanelKind;
  deep: string;
  accent: string;
  capHeight: number;
}) {
  if (panel === "cloud") {
    return (
      <>
        <div
          className="absolute inset-x-[5%]"
          style={{ top: capHeight - 8, bottom: capHeight - 8, background: PAPER, borderRadius: 24 }}
        />
        <svg
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0"
          style={{ height: capHeight }}
        >
          <path
            d="M20 60c-8-16-2-32 14-38 4-16 22-26 40-20 10-16 34-20 50-8 12-12 34-12 46 2 16-8 38 0 44 16 18-2 34 10 36 26 1 8 0 16-4 22z"
            fill={PAPER}
          />
        </svg>
        <svg
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 rotate-180"
          style={{ height: capHeight }}
        >
          <path
            d="M20 60c-8-16-2-32 14-38 4-16 22-26 40-20 10-16 34-20 50-8 12-12 34-12 46 2 16-8 38 0 44 16 18-2 34 10 36 26 1 8 0 16-4 22z"
            fill={PAPER}
          />
        </svg>
        <div
          className="absolute inset-x-[7%] rounded-[20px]"
          style={{ top: capHeight, bottom: capHeight, boxShadow: `inset 0 0 0 0 ${accent}` }}
        />
      </>
    );
  }

  if (panel === "sign") {
    return (
      <>
        <div
          className="absolute inset-x-[4%] rounded-[14px]"
          style={{
            top: 6,
            bottom: 6,
            background: `repeating-linear-gradient(180deg, ${PAPER} 0px, ${PAPER} 26px, ${PAPER_DEEP} 27px, ${PAPER} 28px)`,
            boxShadow: `inset 0 0 0 6px ${withAlpha(deep, 0.35)}, inset 0 0 0 10px ${PAPER}`,
          }}
        />
        {/* Posts holding the sign up, and the nails in its corners. */}
        <div
          className="absolute left-[2%] w-[3%] rounded-full"
          style={{ top: -10, bottom: -10, background: withAlpha(deep, 0.5) }}
        />
        <div
          className="absolute right-[2%] w-[3%] rounded-full"
          style={{ top: -10, bottom: -10, background: withAlpha(deep, 0.5) }}
        />
        {[
          { left: "7%", top: 18 },
          { right: "7%", top: 18 },
          { left: "7%", bottom: 18 },
          { right: "7%", bottom: 18 },
        ].map((position, index) => (
          <span
            key={index}
            className="absolute h-2.5 w-2.5 rounded-full"
            style={{ ...position, background: withAlpha(deep, 0.45) }}
          />
        ))}
      </>
    );
  }

  if (panel === "scroll") {
    return (
      <>
        <div
          className="absolute inset-x-[6%]"
          style={{
            top: capHeight - 12,
            bottom: capHeight - 12,
            background: `linear-gradient(90deg, ${PAPER_DEEP} 0%, ${PAPER} 12%, ${PAPER} 88%, ${PAPER_DEEP} 100%)`,
          }}
        />
        {/* Rolled ends, top and bottom. */}
        {[0, 1].map((index) => (
          <div
            key={index}
            className="absolute inset-x-0"
            style={{
              height: capHeight,
              top: index === 0 ? 0 : undefined,
              bottom: index === 1 ? 0 : undefined,
            }}
          >
            <div
              className="absolute inset-x-[2%] h-full rounded-full"
              style={{
                background: `linear-gradient(180deg, ${PAPER} 0%, ${PAPER_DEEP} 62%, ${withAlpha(
                  deep,
                  0.28,
                )} 100%)`,
                transform: index === 1 ? "rotate(180deg)" : undefined,
              }}
            />
            <span
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
              style={{ left: "1%", background: withAlpha(deep, 0.35) }}
            />
            <span
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
              style={{ right: "1%", background: withAlpha(deep, 0.35) }}
            />
          </div>
        ))}
        <div
          className="absolute inset-x-[6%]"
          style={{
            top: capHeight - 12,
            bottom: capHeight - 12,
            boxShadow: `inset 0 0 0 1px ${withAlpha(deep, 0.12)}`,
          }}
        />
      </>
    );
  }

  return (
    <>
      <div
        className="absolute inset-x-[3%] rounded-[20px]"
        style={{
          top: 10,
          bottom: 10,
          background: PAPER,
          boxShadow: `inset 0 0 0 1px ${withAlpha(deep, 0.12)}, inset 0 0 0 8px ${withAlpha(
            accent,
            0.16,
          )}`,
        }}
      />
      {/* Deckled edges, top and bottom. */}
      {[0, 1].map((index) => (
        <svg
          key={index}
          viewBox="0 0 400 14"
          preserveAspectRatio="none"
          className={`absolute inset-x-[3%] ${index === 1 ? "rotate-180" : ""}`}
          style={{ height: 14, top: index === 0 ? 4 : undefined, bottom: index === 1 ? 4 : undefined }}
        >
          <path
            d="M0 14V6c25-8 50-8 75 0s50 8 75 0 50-8 75 0 50 8 75 0 50-8 100 2v6Z"
            fill={PAPER}
          />
        </svg>
      ))}
      <span
        className="absolute left-1/2 h-4 w-16 -translate-x-1/2 -rotate-2 rounded-sm"
        style={{ top: -6, background: withAlpha(accent, 0.55) }}
      />
    </>
  );
}
