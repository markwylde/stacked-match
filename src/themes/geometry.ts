/**
 * Path helpers used to author icons. Every icon is drawn on the same 24x24
 * canvas with the same stroke weight, which is what keeps five separate themes
 * looking like one family.
 */

export const VIEWBOX = 24;

const round = (value: number): string => Number(value.toFixed(2)).toString();

/** A full circle as a path, so every shape can share one renderer. */
export const circle = (cx: number, cy: number, r: number): string =>
  `M ${round(cx - r)} ${round(cy)} a ${round(r)} ${round(r)} 0 1 0 ${round(r * 2)} 0 a ${round(r)} ${round(r)} 0 1 0 ${round(-r * 2)} 0 z`;

/** An axis-aligned ellipse as a path. */
export const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M ${round(cx - rx)} ${round(cy)} a ${round(rx)} ${round(ry)} 0 1 0 ${round(rx * 2)} 0 a ${round(rx)} ${round(ry)} 0 1 0 ${round(-rx * 2)} 0 z`;

/** A rounded rectangle as a path. */
export const rect = (x: number, y: number, w: number, h: number, r = 2): string => {
  const radius = Math.min(r, w / 2, h / 2);
  return [
    `M ${round(x + radius)} ${round(y)}`,
    `h ${round(w - radius * 2)}`,
    `a ${round(radius)} ${round(radius)} 0 0 1 ${round(radius)} ${round(radius)}`,
    `v ${round(h - radius * 2)}`,
    `a ${round(radius)} ${round(radius)} 0 0 1 ${round(-radius)} ${round(radius)}`,
    `h ${round(-(w - radius * 2))}`,
    `a ${round(radius)} ${round(radius)} 0 0 1 ${round(-radius)} ${round(-radius)}`,
    `v ${round(-(h - radius * 2))}`,
    `a ${round(radius)} ${round(radius)} 0 0 1 ${round(radius)} ${round(-radius)}`,
    'z',
  ].join(' ');
};

/** A straight line segment. */
export const line = (x1: number, y1: number, x2: number, y2: number): string =>
  `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`;

/** Evenly spaced rays around a centre, used for suns and sparkles. */
export const rays = (cx: number, cy: number, inner: number, outer: number, count: number): string =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return line(
      cx + Math.cos(angle) * inner,
      cy + Math.sin(angle) * inner,
      cx + Math.cos(angle) * outer,
      cy + Math.sin(angle) * outer,
    );
  }).join(' ');

/** A regular polygon, used for stars and crystals. */
export const polygon = (points: readonly (readonly [number, number])[]): string =>
  `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${round(x)} ${round(y)}`).join(' ')} z`;

/** A five-pointed star. */
export const star = (cx: number, cy: number, outer: number, inner: number): string =>
  polygon(
    Array.from({ length: 10 }, (_, index) => {
      const radius = index % 2 === 0 ? outer : inner;
      const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
    }),
  );
