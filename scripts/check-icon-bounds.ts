/**
 * Bounds check for icon artwork against the cropped viewBox.
 *
 * An arc bulges away from its chord, so it is bounded by its endpoints padded
 * perpendicular to that chord: a horizontal chord can only bulge vertically.
 * That is exact for the full circles and ellipses the icon helpers emit, and
 * conservative elsewhere, so anything reported as fitting definitely fits.
 */
import { THEMES } from '../src/themes/themes.js';

const NUM = /-?\d*\.?\d+/g;

const boundsOf = (d: string): [number, number, number, number] => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let x = 0;
  let y = 0;
  const see = (px: number, py: number, padX = 0, padY = 0): void => {
    minX = Math.min(minX, px - padX);
    maxX = Math.max(maxX, px + padX);
    minY = Math.min(minY, py - padY);
    maxY = Math.max(maxY, py + padY);
  };

  for (const [, cmd, argsRaw] of d.matchAll(/([MLHVCAmlhvcaz])([^MLHVCAmlhvcaz]*)/g)) {
    const n = (argsRaw ?? '').match(NUM)?.map(Number) ?? [];
    switch (cmd) {
      case 'M': case 'L': for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]!; y = n[i + 1]!; see(x, y); } break;
      case 'm': case 'l': for (let i = 0; i + 1 < n.length; i += 2) { x += n[i]!; y += n[i + 1]!; see(x, y); } break;
      case 'H': for (const v of n) { x = v; see(x, y); } break;
      case 'h': for (const v of n) { x += v; see(x, y); } break;
      case 'V': for (const v of n) { y = v; see(x, y); } break;
      case 'v': for (const v of n) { y += v; see(x, y); } break;
      case 'C': for (let i = 0; i + 5 < n.length; i += 6) { see(n[i]!, n[i + 1]!); see(n[i + 2]!, n[i + 3]!); x = n[i + 4]!; y = n[i + 5]!; see(x, y); } break;
      case 'c': for (let i = 0; i + 5 < n.length; i += 6) { see(x + n[i]!, y + n[i + 1]!); see(x + n[i + 2]!, y + n[i + 3]!); x += n[i + 4]!; y += n[i + 5]!; see(x, y); } break;
      case 'A':
      case 'a':
        for (let i = 0; i + 6 < n.length; i += 7) {
          const rx = Math.abs(n[i]!);
          const ry = Math.abs(n[i + 1]!);
          const ex = cmd === 'A' ? n[i + 5]! : x + n[i + 5]!;
          const ey = cmd === 'A' ? n[i + 6]! : y + n[i + 6]!;
          // Pad only across the chord; along it the endpoints already bound.
          const flat = Math.abs(ey - y) < 1e-6;
          const upright = Math.abs(ex - x) < 1e-6;
          const padX = flat ? 0 : upright ? rx : rx;
          const padY = flat ? ry : upright ? 0 : ry;
          see(x, y, padX, padY);
          see(ex, ey, padX, padY);
          x = ex;
          y = ey;
        }
        break;
      default: break;
    }
  }
  return [minX, minY, maxX, maxY];
};

const [VX, VY, VW, VH] = '2 2 20 20'.split(' ').map(Number) as [number, number, number, number];
let worst = 0;
const offenders: string[] = [];

for (const theme of THEMES) {
  for (const icon of theme.icons) {
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const shape of icon.shapes) {
      const [a, b, c, e] = boundsOf(shape.d);
      minX = Math.min(minX, a); minY = Math.min(minY, b);
      maxX = Math.max(maxX, c); maxY = Math.max(maxY, e);
    }
    const over = Math.max(VX - minX, VY - minY, maxX - (VX + VW), maxY - (VY + VH));
    worst = Math.max(worst, over);
    if (over > 0) {
      offenders.push(`${theme.id}/${icon.id}  x ${minX.toFixed(1)}..${maxX.toFixed(1)}  y ${minY.toFixed(1)}..${maxY.toFixed(1)}  over by ${over.toFixed(2)}`);
    }
  }
}

console.log(`viewBox ${VX} ${VY} ${VW} ${VH}`);
console.log(offenders.length === 0 ? 'all icons fit (conservative bound)' : offenders.join('\n'));
console.log(`worst overshoot: ${worst.toFixed(2)} units`);
