import { circle, ellipse, line, polygon, rays, rect, star } from './geometry.js';

/**
 * Icons are original artwork authored for this game on a shared 24x24 canvas.
 * Each is built from filled shapes (which take the theme colour) and line
 * shapes (the ink on top), which is what produces the colour-filled line look.
 *
 * Every icon in a theme must be identifiable from its outline alone, so no two
 * icons in a set may share a silhouette and differ only by colour.
 */
export interface IconShape {
  readonly d: string;
  readonly role: 'fill' | 'line';
}

export interface IconDef {
  readonly id: string;
  readonly label: string;
  readonly shapes: readonly IconShape[];
}

const f = (...paths: string[]): IconShape => ({ d: paths.join(' '), role: 'fill' });
const l = (...paths: string[]): IconShape => ({ d: paths.join(' '), role: 'line' });
const icon = (id: string, label: string, ...shapes: IconShape[]): IconDef => ({ id, label, shapes });

export const GARDEN_ICONS: readonly IconDef[] = [
  icon('leaf', 'Leaf', f('M 12 4 C 18.5 7 19 14 12 20 C 5 14 5.5 7 12 4 z'), l(line(12, 19, 12, 6))),
  icon(
    'flower',
    'Flower',
    f(circle(12, 7.6, 3.4), circle(16.4, 12, 3.4), circle(12, 16.4, 3.4), circle(7.6, 12, 3.4)),
    l(circle(12, 12, 2.4)),
  ),
  icon(
    'tree',
    'Tree',
    f(circle(12, 9.5, 5.5)),
    l(line(12, 14, 12, 20), line(12, 17, 9, 15), line(12, 16.5, 15, 14.5)),
  ),
  icon(
    'watering-can',
    'Watering can',
    f(rect(4, 10, 11, 9, 2.5)),
    l('M 15 13 L 20 9.5 L 20 13.5', 'M 6.5 10 C 6.5 6 12.5 6 12.5 10'),
  ),
  icon(
    'sprout',
    'Sprout',
    f('M 12 13 C 8 13 5 10 5 6 C 9 6 12 9 12 13 z', 'M 12 13 C 16 13 19 10 19 6 C 15 6 12 9 12 13 z'),
    l(line(12, 20.5, 12, 12)),
  ),
  icon(
    'mushroom',
    'Mushroom',
    f('M 3.5 12.5 a 8.5 6.5 0 0 1 17 0 z'),
    l('M 9.5 12.5 V 17.5 a 2.5 2.5 0 0 0 5 0 V 12.5'),
  ),
  icon(
    'butterfly',
    'Butterfly',
    f(
      'M 12 12 C 7 5 2 7.5 3.5 12.5 C 5 17 10 15.5 12 12 z',
      'M 12 12 C 17 5 22 7.5 20.5 12.5 C 19 17 14 15.5 12 12 z',
    ),
    l(line(12, 6, 12, 18)),
  ),
  icon(
    'bee',
    'Bee',
    f(ellipse(12, 14, 5, 4.2)),
    l(line(9.6, 10.8, 9.6, 17.6), line(13, 10.2, 13, 18), ellipse(8, 8, 3, 2), ellipse(16, 8, 3, 2)),
  ),
  icon(
    'carrot',
    'Carrot',
    f(polygon([
      [12, 20.5],
      [7.5, 9.5],
      [16.5, 9.5],
    ])),
    l(line(12, 9.5, 12, 4.5), line(12, 6.5, 8.5, 4.5), line(12, 6.5, 15.5, 4.5)),
  ),
  icon('sun', 'Sun', f(circle(12, 12, 5)), l(rays(12, 12, 7, 9.5, 8))),
  icon(
    'cloud',
    'Cloud',
    f('M 7.5 18 A 4.2 4.2 0 0 1 8 9.7 A 5.4 5.4 0 0 1 17.6 11 A 3.6 3.6 0 0 1 16.8 18 z'),
    l('M 7.5 18 A 4.2 4.2 0 0 1 8 9.7 A 5.4 5.4 0 0 1 17.6 11 A 3.6 3.6 0 0 1 16.8 18 z'),
  ),
  icon(
    'raindrop',
    'Raindrop',
    f('M 12 3.5 C 12 3.5 6 10.5 6 14.5 a 6 6 0 0 0 12 0 C 18 10.5 12 3.5 12 3.5 z'),
  ),
  icon(
    'snail',
    'Snail',
    f(circle(14, 12, 5.5)),
    l('M 4 18.5 H 14', 'M 4 18.5 C 4 13.5 6.5 11 9.5 11', circle(14, 12, 2.2)),
  ),
  icon(
    'ladybird',
    'Ladybird',
    f(circle(12, 13, 6)),
    l(line(12, 7, 12, 19), circle(9.4, 11.6, 1), circle(14.6, 11.6, 1), circle(12, 16.8, 1)),
  ),
  icon(
    'fence',
    'Fence',
    f(rect(4, 8, 3, 12, 1), rect(10.5, 8, 3, 12, 1), rect(17, 8, 3, 12, 1)),
    l('M 3 12 H 21', 'M 3 16 H 21'),
  ),
];

export const KITCHEN_ICONS: readonly IconDef[] = [
  icon('cup', 'Cup', f(rect(5, 9, 11, 9, 2)), l('M 16 11 a 3 3 0 0 1 0 5')),
  icon(
    'teapot',
    'Teapot',
    f(ellipse(12, 14, 6.5, 5)),
    l('M 18 12 L 21.5 9.5', 'M 9.5 9 H 14.5', circle(12, 7.5, 1.2)),
  ),
  icon('spoon', 'Spoon', f(ellipse(12, 7, 3.2, 4)), l(line(12, 11, 12, 20.5))),
  icon(
    'fork',
    'Fork',
    f(rect(11, 9.5, 2, 11, 1)),
    l(line(8.5, 3.5, 8.5, 8), line(12, 3.5, 12, 8), line(15.5, 3.5, 15.5, 8), 'M 8.5 8 a 3.5 3.5 0 0 0 7 0'),
  ),
  icon(
    'knife',
    'Knife',
    f(polygon([
      [4, 13],
      [15, 4.5],
      [16.5, 7],
      [6, 15],
    ])),
    l(line(6, 15, 3, 19.5)),
  ),
  icon('pot', 'Pot', f(rect(4.5, 9.5, 15, 9, 2)), l('M 3 9.5 H 21', 'M 10.5 6.5 H 13.5')),
  icon('bowl', 'Bowl', f('M 4 11 h 16 a 8 8 0 0 1 -16 0 z'), l('M 3 11 H 21')),
  icon(
    'egg',
    'Egg',
    f('M 12 4 C 16.5 4 19 10 19 13.5 a 7 7 0 0 1 -14 0 C 5 10 7.5 4 12 4 z'),
  ),
  icon(
    'bread',
    'Bread',
    f('M 4 12 a 8 6 0 0 1 16 0 v 6 h -16 z'),
    l(line(8, 12.5, 8, 18), line(12, 12.5, 12, 18), line(16, 12.5, 16, 18)),
  ),
  icon(
    'cheese',
    'Cheese',
    f(polygon([
      [3.5, 16],
      [13, 7],
      [20.5, 7],
      [20.5, 16],
    ])),
    l(circle(16, 12, 1.4), circle(11, 14, 1.2)),
  ),
  icon(
    'whisk',
    'Whisk',
    f(rect(11, 15.5, 2, 5.5, 1)),
    l('M 12 15.5 C 7 13.5 6.5 6.5 12 4.5', 'M 12 15.5 C 17 13.5 17.5 6.5 12 4.5', line(12, 15.5, 12, 4.5)),
  ),
  icon('jar', 'Jar', f(rect(5.5, 8, 13, 12, 2.5)), l('M 5 8 H 19', 'M 8 8 V 5 H 16 V 8')),
  icon(
    'kettle',
    'Kettle',
    f(rect(5, 10, 13, 9, 3)),
    l('M 18 13 L 21.5 11', 'M 8.5 10 C 8.5 5.5 15.5 5.5 15.5 10'),
  ),
  icon('plate', 'Plate', f(circle(12, 12, 8.5)), l(circle(12, 12, 5.5))),
  icon('rolling-pin', 'Rolling pin', f(rect(6, 10, 12, 5, 2.5)), l('M 6 12.5 H 2.5', 'M 18 12.5 H 21.5')),
];

export const OCEAN_ICONS: readonly IconDef[] = [
  icon(
    'fish',
    'Fish',
    f(
      'M 18 12 C 14 7.5 7 7.5 3.5 12 C 7 16.5 14 16.5 18 12 z',
      polygon([
        [17.5, 12],
        [21.5, 9],
        [21.5, 15],
      ]),
    ),
    l(circle(7, 11, 0.9)),
  ),
  icon(
    'shell',
    'Shell',
    f('M 12 19 C 5 19 3 12 6 7 C 9 3 15 3 18 7 C 21 12 19 19 12 19 z'),
    l(line(12, 19, 6.5, 8), line(12, 19, 12, 4.6), line(12, 19, 17.5, 8)),
  ),
  icon('starfish', 'Starfish', f(star(12, 12, 8.5, 4))),
  icon(
    'wave',
    'Wave',
    f('M 2.6 16 C 5.4 11 9 11 12 16 C 15 21 18.6 21 21.4 16 V 21 H 2.6 z'),
    l('M 2.6 11 C 5.4 6 9 6 12 11'),
  ),
  icon(
    'anchor',
    'Anchor',
    f(circle(12, 5, 2)),
    l(line(12, 7, 12, 20), 'M 7 10 H 17', 'M 4.5 13.5 a 7.5 7.5 0 0 0 15 0'),
  ),
  icon(
    'boat',
    'Boat',
    f('M 3 15 H 21 L 18 20 H 6 z'),
    l(line(12, 15, 12, 4), 'M 12 6 L 18 12 H 12'),
  ),
  icon(
    'jellyfish',
    'Jellyfish',
    f('M 4.5 12 a 7.5 7.5 0 0 1 15 0 z'),
    l(line(7, 12, 7, 17), line(10, 12, 10, 19.5), line(14, 12, 14, 19.5), line(17, 12, 17, 17)),
  ),
  icon(
    'crab',
    'Crab',
    f(ellipse(12, 13.5, 6, 4.5)),
    l(
      line(6.5, 10.5, 3.5, 7),
      line(17.5, 10.5, 20.5, 7),
      line(6.5, 16.5, 3.5, 19.5),
      line(17.5, 16.5, 20.5, 19.5),
      circle(10, 11.5, 0.9),
      circle(14, 11.5, 0.9),
    ),
  ),
  icon(
    'coral',
    'Coral',
    f(circle(7.5, 5.8, 1.8), circle(16.5, 5.2, 1.8), circle(12, 9.5, 1.8)),
    l(line(12, 20.5, 12, 11), line(12, 14, 7.5, 9.5), line(12, 13, 16.5, 8.5), line(7.5, 9.5, 7.5, 7.6)),
  ),
  icon('bubble', 'Bubble', f(circle(12, 12, 7.5)), l(circle(9.5, 9.5, 1.8))),
  icon(
    'whale',
    'Whale',
    f(
      'M 3 13 C 3 8.5 8 6.5 12.5 6.5 C 17 6.5 20 9 20 13 C 20 16.5 16.5 18 12 18 C 7 18 3 16.5 3 13 z',
    ),
    l(line(12.5, 6.5, 12.5, 3), circle(7, 12, 0.9)),
  ),
  icon(
    'seaweed',
    'Seaweed',
    f(rect(4, 19, 16, 1.8, 0.9)),
    l('M 8 19 C 5 15 11 12 8 8 C 6 5.5 8 4 8 3.5', 'M 15 19 C 18 15 12 12 15 8 C 17 5.5 15 4 15 3.5'),
  ),
  icon(
    'lighthouse',
    'Lighthouse',
    f(polygon([
      [8.5, 20],
      [9.5, 9],
      [14.5, 9],
      [15.5, 20],
    ])),
    l('M 8 9 H 16', rect(10, 4.5, 4, 4.5, 1), 'M 7 20 H 17'),
  ),
  icon(
    'compass',
    'Compass',
    f(circle(12, 12, 8.5)),
    l(polygon([
      [12, 6.5],
      [14, 12],
      [12, 17.5],
      [10, 12],
    ])),
  ),
  icon('pearl', 'Pearl', f(circle(12, 13, 5.5)), l('M 3.5 13 a 8.5 8.5 0 0 1 17 0 z')),
];

export const SPACE_ICONS: readonly IconDef[] = [
  icon('star', 'Star', f(star(12, 12, 8.5, 3.8))),
  icon('planet', 'Planet', f(circle(12, 11, 6.5)), l(ellipse(12, 13.5, 9.3, 2.9))),
  icon(
    'rocket',
    'Rocket',
    f('M 12 3 C 15.5 6.5 16.5 11 16.5 14 H 7.5 C 7.5 11 8.5 6.5 12 3 z'),
    l(circle(12, 9, 2), 'M 7.5 14 L 4.5 18 H 9', 'M 16.5 14 L 19.5 18 H 15'),
  ),
  icon('moon', 'Moon', f('M 16 3.5 A 9 9 0 1 0 16 20.5 A 7 7 0 1 1 16 3.5 z')),
  icon(
    'comet',
    'Comet',
    f(circle(16, 8, 4)),
    l(line(13, 11, 4, 20), line(16, 12.5, 9.5, 19.5), line(10.5, 9.5, 4.5, 15.5)),
  ),
  icon(
    'satellite',
    'Satellite',
    f(rect(9.5, 9.5, 5, 5, 1)),
    l(rect(2.5, 10, 6, 4, 1), rect(15.5, 10, 6, 4, 1), line(12, 9.5, 12, 5.5), circle(12, 4, 1.5)),
  ),
  icon(
    'ufo',
    'Ufo',
    f(ellipse(12, 14, 8.5, 3.5)),
    l('M 7 12.5 a 5 4.5 0 0 1 10 0', circle(8, 14.5, 0.9), circle(12, 15, 0.9), circle(16, 14.5, 0.9)),
  ),
  icon(
    'telescope',
    'Telescope',
    f(polygon([
      [3, 13],
      [16, 6],
      [18, 10],
      [5, 17],
    ])),
    l(line(9.5, 15, 9.5, 20), 'M 6 20 H 13'),
  ),
  icon(
    'astronaut',
    'Astronaut',
    f(circle(12, 10, 6)),
    l('M 8.4 10 a 3.6 3.6 0 0 1 7.2 0', line(7.5, 15, 6, 20), line(16.5, 15, 18, 20)),
  ),
  icon('galaxy', 'Galaxy', f(circle(12, 12, 2.5)), l(ellipse(12, 12, 9, 4), ellipse(12, 12, 5.5, 2.4))),
  icon(
    'meteor',
    'Meteor',
    f(circle(14, 10, 5)),
    l(line(10, 14, 3.5, 20.5), line(13, 15.5, 8, 20.5), line(8.5, 11.5, 3.5, 15)),
  ),
  icon('orbit', 'Orbit', f(circle(12, 12, 3), circle(20.1, 12, 1.5)), l(ellipse(12, 12, 9, 4.5))),
  icon('solar', 'Solar flare', f(circle(12, 12, 4.5)), l(rays(12, 12, 6.5, 9.5, 12))),
  icon(
    'constellation',
    'Constellation',
    f(circle(5, 17, 1.5), circle(9, 9, 1.5), circle(15, 12, 1.5), circle(19, 5, 1.5)),
    l('M 5 17 L 9 9 L 15 12 L 19 5'),
  ),
  icon('blackhole', 'Black hole', f(circle(12, 12, 4)), l(circle(12, 12, 7.5), circle(12, 12, 9.8))),
];

export const CAFE_ICONS: readonly IconDef[] = [
  icon('coffee-cup', 'Coffee cup', f(rect(4, 8, 12, 10, 2)), l('M 16 10.5 a 3.2 3.2 0 0 1 0 5.5', 'M 3 19.5 H 17')),
  icon(
    'croissant',
    'Croissant',
    f('M 4 16 C 4 10 8 6.5 12 6.5 C 16 6.5 20 10 20 16 C 17 17.5 15 15 12 15 C 9 15 7 17.5 4 16 z'),
    l(line(9, 8.5, 8.2, 14), line(15, 8.5, 15.8, 14)),
  ),
  icon(
    'cake-slice',
    'Cake slice',
    f(polygon([
      [4, 18],
      [12, 6],
      [20, 18],
    ])),
    l('M 6.7 14 H 17.3'),
  ),
  icon(
    'donut',
    'Donut',
    f(circle(12, 12, 8)),
    l(circle(12, 12, 3), line(12, 4.5, 12, 6.2), line(19, 14, 17.4, 13.4), line(6.5, 15.5, 8, 14.6)),
  ),
  icon('teabag', 'Tea bag', f(rect(7, 10, 10, 9, 1.5)), l(line(12, 10, 12, 5), 'M 12 5 H 16')),
  icon(
    'sugar-cube',
    'Sugar cube',
    f(rect(6.5, 10, 11, 9, 1.5)),
    l(polygon([
      [6.5, 10],
      [10, 6.5],
      [21, 6.5],
      [17.5, 10],
    ])),
  ),
  icon(
    'milk-jug',
    'Milk jug',
    f('M 6 9 H 16 L 17 19 H 5 z'),
    l('M 16 11 a 3 3 0 0 1 0 5', 'M 6 9 L 8 6.5 H 14'),
  ),
  icon(
    'cookie',
    'Cookie',
    f(circle(12, 12, 8)),
    l(circle(9, 10, 1.1), circle(14.5, 10.5, 1.1), circle(11, 15, 1.1), circle(15.2, 14.8, 1.1)),
  ),
  icon('macaron', 'Macaron', f(ellipse(12, 9, 7.5, 3.5), ellipse(12, 16, 7.5, 3.5)), l('M 4.5 12.5 H 19.5')),
  icon(
    'cup-to-go',
    'Cup to go',
    f(polygon([
      [6.5, 8],
      [17.5, 8],
      [16, 20],
      [8, 20],
    ])),
    l('M 5 8 H 19', 'M 5 8 L 6 5 H 18 L 19 8'),
  ),
  icon('muffin', 'Muffin', f('M 6 12 h 12 l -1.5 8 h -9 z'), l('M 5 12 a 7 5 0 0 1 14 0', 'M 5 12 H 19')),
  icon('coffee-bean', 'Coffee bean', f(ellipse(12, 12, 6, 8)), l('M 12 4 C 8 8 16 16 12 20')),
  icon('menu', 'Menu', f(rect(5.5, 4, 13, 16, 1.5)), l('M 8.5 9 H 15.5', 'M 8.5 12.5 H 15.5', 'M 8.5 16 H 13')),
  icon('clock', 'Clock', f(circle(12, 12, 8.5)), l('M 12 7 V 12 L 15.5 14')),
  icon('chair', 'Chair', f(rect(6, 5, 12, 7, 2)), l(line(7, 20, 7, 12), line(17, 20, 17, 12), 'M 7 16 H 17')),
];
