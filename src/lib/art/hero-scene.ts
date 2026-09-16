/**
 * Two scenes that are not tied to a theme:
 *
 *   giftMomentScene()     the moment the book is opened — a grown-up and a
 *                         child reading it together on the sofa. Everyone in
 *                         it is invented.
 *   pressWorkshopScene()  a book being painted, used while a real one is being
 *                         made.
 *
 * Both return complete SVG documents for `scripts/generate-art.ts`.
 */

import { n } from "./primitives.ts";

const WARM = {
  wall: "#f3e2cc",
  wallDeep: "#e6cba9",
  floor: "#d9b68e",
  rug: "#cf7f5e",
  rugDeep: "#b0603f",
  sofa: "#c9856a",
  sofaDeep: "#a86348",
  ink: "#3a2618",
  cream: "#fff6e8",
  lamp: "#ffd88f",
  leaf: "#6e9464",
  night: "#7fa6c4",
};

function head(x: number, y: number, r: number, skin: string, hair: string, hairPath: string, eyeR = 4): string {
  return (
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${skin}"/>` +
    hairPath +
    `<circle cx="${n(x - r * 0.34)}" cy="${n(y + r * 0.02)}" r="${n(eyeR)}" fill="${WARM.ink}"/>` +
    `<circle cx="${n(x + r * 0.34)}" cy="${n(y + r * 0.02)}" r="${n(eyeR)}" fill="${WARM.ink}"/>` +
    `<path d="M${n(x - r * 0.26)} ${n(y + r * 0.42)}c${n(r * 0.16)} ${n(r * 0.18)} ${n(r * 0.36)} ${n(
      r * 0.18,
    )} ${n(r * 0.52)} 0" stroke="${WARM.ink}" stroke-width="${n(r * 0.1)}" fill="none" stroke-linecap="round"/>` +
    `<circle cx="${n(x - r * 0.62)}" cy="${n(y + r * 0.3)}" r="${n(r * 0.18)}" fill="#e08a7a" opacity="0.45"/>` +
    `<circle cx="${n(x + r * 0.62)}" cy="${n(y + r * 0.3)}" r="${n(r * 0.18)}" fill="#e08a7a" opacity="0.45"/>`
  );
}

/** The open book they are reading, drawn as two pages with a picture on one side. */
function openBook(x: number, y: number, scale: number): string {
  return (
    `<g transform="translate(${n(x)} ${n(y)}) scale(${scale}) rotate(-6)">` +
    `<path d="M-150 0c50-26 104-26 150-6 46-20 100-20 150 6-50 34-104 36-150 16-46 20-100 18-150-16z" fill="${WARM.cream}"/>` +
    `<path d="M0-6v22" stroke="${WARM.ink}" stroke-width="3" opacity="0.25"/>` +
    `<path d="M-150 0c50-26 104-26 150-6v22c-46-20-100-20-150 6z" fill="#ffffff" opacity="0.5"/>` +
    // A little picture printed on the left page.
    `<circle cx="-92" cy="-8" r="20" fill="#f0b64b" opacity="0.9"/>` +
    `<path d="M-132 4c14-16 30-16 44 0 10-10 22-10 32 0z" fill="#7fa86b"/>` +
    // Lines of story on the right page.
    `<g stroke="${WARM.ink}" stroke-width="3" opacity="0.28" stroke-linecap="round">` +
    `<path d="M40-4h86M46 6h74M52 16h56"/>` +
    `</g>` +
    `<path d="M-150 0c50-26 104-26 150-6 46-20 100-20 150 6" fill="none" stroke="${WARM.ink}" stroke-width="4" opacity="0.35"/>` +
    `</g>`
  );
}

export function giftMomentScene(): string {
  const width = 1600;
  const height = 1100;

  const adultHair = `<path d="M762 566c0-46 26-74 64-74s64 28 64 74c0 14-2 26-6 36 2-34-20-52-58-52s-60 18-58 52c-4-10-6-22-6-36z" fill="#4a3324"/><path d="M756 586c-12 22-14 48-8 70 12 2 20-6 20-20 0-16-4-32-12-50z" fill="#4a3324"/>`;
  const childHair = `<g fill="#2a1a12"><circle cx="620" cy="624" r="24"/><circle cx="656" cy="608" r="28"/><circle cx="692" cy="624" r="24"/><circle cx="608" cy="648" r="18"/><circle cx="704" cy="648" r="18"/></g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>` +
    `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${WARM.wall}"/><stop offset="1" stop-color="${WARM.wallDeep}"/>` +
    `</linearGradient>` +
    `<radialGradient id="lamplight" cx="0.78" cy="0.32" r="0.55">` +
    `<stop offset="0" stop-color="#ffe6b0" stop-opacity="0.85"/><stop offset="1" stop-color="#ffe6b0" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="windowsky" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#9dc0d8"/><stop offset="1" stop-color="#f4c79c"/>` +
    `</linearGradient>` +
    `<radialGradient id="cornerdark" cx="0.5" cy="0.5" r="0.75">` +
    `<stop offset="0.55" stop-color="${WARM.ink}" stop-opacity="0"/><stop offset="1" stop-color="${WARM.ink}" stop-opacity="0.28"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${width}" height="${height}" fill="url(#wall)"/>` +
    `<rect y="${height - 250}" width="${width}" height="250" fill="${WARM.floor}"/>` +
    `<path d="M0 ${height - 250}h${width}v18H0z" fill="${WARM.ink}" opacity="0.12"/>` +

    // Window with evening light.
    `<g transform="translate(150 150)">` +
    `<rect x="-14" y="-14" width="348" height="428" rx="18" fill="${WARM.cream}" opacity="0.9"/>` +
    `<rect width="320" height="400" rx="10" fill="url(#windowsky)"/>` +
    `<circle cx="228" cy="104" r="40" fill="#ffe1a8" opacity="0.9"/>` +
    `<path d="M0 320c60-40 110-38 160-6 44 28 92 28 160-6v92H0z" fill="#8fae86" opacity="0.65"/>` +
    `<path d="M160 0v400M0 200h320" stroke="${WARM.cream}" stroke-width="14"/>` +
    `<path d="M-30-20c40 14 40 420 0 440z" fill="${WARM.sofa}" opacity="0.75"/>` +
    `<path d="M350-20c-40 14-40 420 0 440z" fill="${WARM.sofa}" opacity="0.75"/>` +
    `</g>` +

    // Shelf of finished books on the wall.
    `<g transform="translate(560 180)">` +
    `<rect y="150" width="300" height="16" rx="6" fill="#b98a5e"/>` +
    `<g>` +
    `<rect x="18" y="66" width="34" height="84" rx="6" fill="#cf7f5e"/>` +
    `<rect x="58" y="52" width="30" height="98" rx="6" fill="#7fa86b"/>` +
    `<rect x="94" y="74" width="36" height="76" rx="6" fill="#e0b25e"/>` +
    `<rect x="136" y="58" width="28" height="92" rx="6" fill="#7795c4"/>` +
    `<path d="M176 150v-56l54-18v74z" fill="#b8687f"/>` +
    `</g>` +
    `</g>` +

    // Floor lamp, the warm source in the room.
    `<g transform="translate(1390 300)">` +
    `<path d="M-70 0h140l-26-96h-88z" fill="${WARM.lamp}"/>` +
    `<path d="M-70 0h140l-26-96h-88z" fill="#ffffff" opacity="0.25"/>` +
    `<path d="M0 0v496" stroke="#8a6a4c" stroke-width="12"/>` +
    `<path d="M-60 496h120" stroke="#8a6a4c" stroke-width="16" stroke-linecap="round"/>` +
    `</g>` +
    `<rect width="${width}" height="${height}" fill="url(#lamplight)"/>` +

    // Potted plant.
    `<g transform="translate(150 838)">` +
    `<path d="M-52 0h104l-14 120h-76z" fill="#c07a55"/>` +
    `<path d="M-52 0h104l-4 30h-96z" fill="${WARM.ink}" opacity="0.12"/>` +
    `<g fill="${WARM.leaf}">` +
    `<path d="M0 0c-8-70-46-106-92-110 6 62 44 100 92 110z"/>` +
    `<path d="M0 0c8-74 48-112 96-116-6 66-46 106-96 116z"/>` +
    `<path d="M0 0c-4-86 12-132 38-160 16 66 4 122-38 160z"/>` +
    `</g>` +
    `</g>` +

    // Rug.
    `<ellipse cx="690" cy="990" rx="600" ry="112" fill="${WARM.rug}"/>` +
    `<ellipse cx="690" cy="990" rx="540" ry="92" fill="none" stroke="${WARM.cream}" stroke-width="10" opacity="0.5"/>` +
    `<ellipse cx="690" cy="990" rx="450" ry="72" fill="${WARM.rugDeep}" opacity="0.35"/>` +

    // Sofa back, with the pair sitting in front of it.
    `<path d="M330 906V744c0-50 36-86 86-86h520c50 0 86 36 86 86v162z" fill="${WARM.sofa}"/>` +
    `<path d="M330 906V744c0-50 36-86 86-86h70c-32 22-48 54-48 96v152z" fill="#ffffff" opacity="0.12"/>` +
    `<path d="M404 700c26-14 52-8 60 14 8 20-6 42-30 46-26 4-46-10-48-32-2-14 6-22 18-28z" fill="#e3b07d"/>` +

    // The grown-up, an arm around the child.
    `<g>` +
    `<path d="M760 880V760c0-46 30-76 66-76s64 30 64 76v120z" fill="#6f7f94"/>` +
    `<path d="M768 782c-48 6-84 26-104 54" stroke="#6f7f94" stroke-width="38" stroke-linecap="round" fill="none"/>` +
    `<circle cx="664" cy="838" r="20" fill="#eec19c"/>` +
    `<path d="M884 782c22 10 36 28 42 52" stroke="#6f7f94" stroke-width="38" stroke-linecap="round" fill="none"/>` +
    `<path d="M796 706c10 16 18 24 30 24s20-8 30-24z" fill="#eec19c"/>` +
    head(826, 606, 62, "#eec19c", "#4a3324", adultHair, 5) +
    `</g>` +

    // The child, the book open on their lap.
    `<g>` +
    `<path d="M582 884V786c0-42 32-70 74-70s74 28 74 70v98z" fill="#d9654a"/>` +
    `<path d="M592 800c-24 10-40 26-48 48M720 800c24 10 40 26 48 48" stroke="#eec19c" stroke-width="30" stroke-linecap="round" fill="none"/>` +
    `<path d="M632 728c8 14 15 20 24 20s17-6 24-20z" fill="#8a5a3b"/>` +
    head(656, 660, 54, "#8a5a3b", "#2a1a12", childHair, 5) +
    `</g>` +

    // Seat and arms in front, so they really are sitting in it.
    `<rect x="356" y="852" width="574" height="96" rx="34" fill="${WARM.sofaDeep}"/>` +
    `<rect x="296" y="772" width="92" height="180" rx="34" fill="${WARM.sofaDeep}"/>` +
    `<rect x="898" y="772" width="92" height="180" rx="34" fill="${WARM.sofaDeep}"/>` +
    `<path d="M296 772h92v28h-92zM898 772h92v28h-92z" fill="#ffffff" opacity="0.12"/>` +
    openBook(666, 872, 1.2) +

    // A wrapped gift, ribbon still on it.
    `<g transform="translate(220 966)">` +
    `<rect x="-90" y="-96" width="180" height="96" rx="10" fill="${WARM.cream}"/>` +
    `<rect x="-90" y="-96" width="180" height="96" rx="10" fill="${WARM.sofa}" opacity="0.2"/>` +
    `<rect x="-14" y="-96" width="28" height="96" fill="#d9654a" opacity="0.9"/>` +
    `<path d="M-14-96c-26-34-58-40-70-22-10 16 8 30 70 22zM14-96c26-34 58-40 70-22 10 16-8 30-70 22z" fill="#d9654a"/>` +
    `<ellipse cx="0" cy="6" rx="110" ry="16" fill="${WARM.ink}" opacity="0.15"/>` +
    `</g>` +

    // The dog, asleep through all of it.
    `<g transform="translate(1076 972)">` +
    `<ellipse cx="0" cy="10" rx="110" ry="20" fill="${WARM.ink}" opacity="0.14"/>` +
    `<path d="M-96 0c-10-44 18-74 66-74 44 0 74 26 70 74z" fill="#e0b98c"/>` +
    `<circle cx="-84" cy="-34" r="34" fill="#e0b98c"/>` +
    `<path d="M-112-48c-16-6-28 2-30 18-2 14 8 24 22 22z" fill="#c79a6a"/>` +
    `<path d="M-108-26c6 4 14 4 20 0" stroke="${WARM.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
    `<circle cx="-96" cy="-38" r="3.5" fill="${WARM.ink}"/>` +
    `</g>` +

    `<rect width="${width}" height="${height}" fill="url(#cornerdark)"/>` +
    `</svg>`
  );
}

export function pressWorkshopScene(): string {
  const width = 1200;
  const height = 900;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>` +
    `<radialGradient id="deskglow" cx="0.5" cy="0.35" r="0.7">` +
    `<stop offset="0" stop-color="#ffe9bd" stop-opacity="0.9"/><stop offset="1" stop-color="#ffe9bd" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${width}" height="${height}" fill="#f6e7d2"/>` +
    `<rect width="${width}" height="${height}" fill="url(#deskglow)"/>` +
    `<rect y="640" width="${width}" height="260" fill="#d8ab7c"/>` +
    `<path d="M0 640h${width}v14H0z" fill="${WARM.ink}" opacity="0.14"/>` +

    // Easel holding a half-painted cover.
    `<g transform="translate(600 360)">` +
    `` +
    `<path d="M-150 280 -40-150M150 280 40-150" stroke="#b07f52" stroke-width="18" stroke-linecap="round"/>` +
    `<path d="M-104 130h208" stroke="#b07f52" stroke-width="18" stroke-linecap="round"/>` +
    `<rect x="-170" y="-200" width="340" height="340" rx="10" fill="${WARM.cream}"/>` +
    `<rect x="-170" y="-200" width="340" height="340" rx="10" fill="none" stroke="${WARM.ink}" stroke-width="6" opacity="0.2"/>` +
    `<path d="M-170 40c60-40 110-38 160-6 44 28 96 28 180-8v114H-170z" fill="#7fa86b" opacity="0.9"/>` +
    `<circle cx="96" cy="-104" r="46" fill="#f0b64b"/>` +
    `<path d="M-150-150c46-16 92-16 138 0" stroke="#d5613f" stroke-width="16" stroke-linecap="round" opacity="0.85"/>` +
    `<path d="M-150-104c30-10 62-12 92-6" stroke="#d5613f" stroke-width="14" stroke-linecap="round" opacity="0.5"/>` +
    `</g>` +

    // Paint pots and brushes.
    `<g transform="translate(250 640)">` +
    `<path d="M-70 0h140l-16 -90h-108z" fill="#cf7f5e"/>` +
    `<path d="M-64-90h128l-6-22h-116z" fill="#fff6e8"/>` +
    `<g stroke="${WARM.ink}" stroke-width="10" stroke-linecap="round" opacity="0.8">` +
    `<path d="M-30-90-56-190M0-92 6-200M30-90 62-186"/>` +
    `</g>` +
    `<circle cx="-56" cy="-200" r="16" fill="#d5613f"/>` +
    `<circle cx="6" cy="-210" r="16" fill="#7795c4"/>` +
    `<circle cx="62" cy="-196" r="16" fill="#e0b25e"/>` +
    `</g>` +
    `<g transform="translate(960 640)">` +
    `<path d="M-90 0h180l-10-70h-160z" fill="#7fa86b"/>` +
    `<ellipse cx="0" cy="-70" rx="80" ry="18" fill="#a6c894"/>` +
    `<path d="M-40-70c10-30 70-30 80 0z" fill="#fff6e8" opacity="0.6"/>` +
    `</g>` +
    `</svg>`
  );
}
