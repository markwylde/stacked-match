import type { LessonDefinition } from '../core/lessons.js';

/**
 * The tutorial, authored as data. Lessons are short and arrive when the rule
 * they teach first matters: the loop before the first level, the colour wash on
 * the second, rising rows and the ceiling on a first endless run.
 *
 * Every step's `expect` is a promise its caption has to keep. The lesson
 * harness plays each lesson through the real rules and fails if an outcome a
 * caption describes does not actually happen.
 */
export const LESSONS: readonly LessonDefinition[] = [
  {
    id: 'the-loop',
    title: 'Taking bricks',
    trigger: 'campaign-first',
    mode: 'campaign',
    themeId: 'garden',
    layout: [['tree', 'leaf'], ['leaf'], ['leaf'], [], [], []],
    steps: [
      {
        column: 0,
        caption: 'Only the top brick of a column can be taken. Tap this leaf.',
        expect: ['BrickTaken'],
      },
      {
        column: 1,
        caption: 'It went into the tray. Bricks wait there until they match. Tap the next leaf.',
        expect: ['BrickTaken'],
      },
      {
        column: 2,
        caption: 'Three of a kind clears. Tap the last leaf and watch the tray.',
        expect: ['BrickTaken', 'TriplePopped'],
      },
    ],
    outro: 'That is the whole game: take a top brick, gather three of a kind, clear them.',
  },
  {
    id: 'the-tray',
    title: 'The tray',
    trigger: 'campaign-first',
    mode: 'campaign',
    themeId: 'garden',
    layout: [['sun'], ['bee'], ['carrot'], ['sun'], ['sun'], []],
    steps: [
      {
        column: 0,
        caption: 'A brick with no match yet still costs you a slot. Tap the sun.',
        expect: ['BrickTaken'],
      },
      {
        column: 1,
        caption: 'The bee has nothing to pair with. Take it anyway.',
        expect: ['BrickTaken'],
      },
      {
        column: 2,
        caption: 'Three slots used, nothing cleared. Slots only come back on a match.',
        expect: ['BrickTaken'],
      },
      {
        column: 3,
        caption: 'A second sun. One more and they go.',
        expect: ['BrickTaken'],
      },
      {
        column: 4,
        caption: 'Three suns clear and hand back their slots. Tap it.',
        expect: ['BrickTaken', 'TriplePopped'],
      },
    ],
    outro:
      'Fourteen slots, and only a match frees them. Fill every slot with no match and the run ends.',
  },
  {
    id: 'the-wash',
    title: 'The colour wash',
    trigger: 'campaign-second',
    mode: 'campaign',
    themeId: 'garden',
    layout: [['mushroom', 'flower'], ['butterfly', 'flower'], ['snail', 'flower'], [], [], []],
    steps: [
      { column: 0, caption: 'Three flowers again. Take the first.', expect: ['BrickTaken'] },
      { column: 1, caption: 'And the second.', expect: ['BrickTaken'] },
      {
        column: 2,
        caption: 'Now watch the bricks underneath as these clear.',
        expect: ['BrickTaken', 'TriplePopped', 'BricksWashed'],
      },
    ],
    outro:
      'Clearing a set washes whatever it uncovered. Washed bricks glow in the level colour.',
  },
  {
    id: 'chains',
    title: 'Chains',
    trigger: 'campaign-second',
    mode: 'campaign',
    themeId: 'garden',
    layout: [['mushroom', 'flower'], ['butterfly', 'flower'], ['snail', 'flower'], [], [], []],
    steps: [
      { column: 0, caption: 'Clear a set to wash the bricks beneath it.', expect: ['BrickTaken'] },
      { column: 1, caption: 'Two down.', expect: ['BrickTaken'] },
      {
        column: 2,
        caption: 'That clears the set and washes three bricks.',
        expect: ['BrickTaken', 'TriplePopped', 'BricksWashed'],
      },
      {
        column: 0,
        caption: 'Take a washed brick to start a chain.',
        expect: ['BrickTaken'],
        expectChain: 1,
      },
      {
        column: 1,
        caption: 'Another washed brick. The chain grows, and so does the bonus.',
        expect: ['BrickTaken'],
        expectChain: 2,
      },
      {
        column: 2,
        caption: 'Three in a row. Taking an unwashed brick would end the chain.',
        expect: ['BrickTaken'],
        expectChain: 3,
      },
    ],
    outro: 'Read the board in runs, not single taps. Chains are where the points are.',
  },
  {
    id: 'rising-rows',
    title: 'Rising rows',
    trigger: 'endless-first',
    mode: 'endless',
    themeId: 'ocean',
    layout: [['fish'], ['fish'], ['fish'], ['shell', 'shell'], [], []],
    startTriplesSinceRise: 2,
    steps: [
      { column: 0, caption: 'Endless mode. Same rules, but the board fights back.', expect: ['BrickTaken'] },
      { column: 1, caption: 'You have cleared two sets already this run.', expect: ['BrickTaken'] },
      {
        column: 2,
        caption: 'This is the third. Watch the floor.',
        expect: ['BrickTaken', 'TriplePopped', 'RowRose'],
      },
    ],
    outro:
      'Every third set you clear pushes a new row up from the floor. Progress and danger are the same move. There is no clock, so take as long as you like.',
  },
  {
    id: 'the-ceiling',
    title: 'The ceiling',
    trigger: 'endless-first',
    mode: 'endless',
    themeId: 'ocean',
    layout: [
      ['fish'],
      ['fish'],
      ['fish'],
      ['coral', 'coral', 'coral', 'coral', 'coral', 'coral', 'coral', 'coral', 'coral', 'coral'],
      [],
      [],
    ],
    startTriplesSinceRise: 2,
    steps: [
      { column: 0, caption: 'That coral column is already at the ceiling.', expect: ['BrickTaken'] },
      { column: 1, caption: 'Clearing this set will push a row up beneath it.', expect: ['BrickTaken'] },
      {
        column: 2,
        caption: 'Which leaves it nowhere to go.',
        expect: ['BrickTaken', 'TriplePopped', 'RunLost'],
      },
    ],
    outro:
      'A rising row with no room ends the run. Keep your tallest column short and you keep playing.',
  },
];

export const lessonsFor = (
  trigger: LessonDefinition['trigger'],
): readonly LessonDefinition[] => LESSONS.filter((lesson) => lesson.trigger === trigger);
