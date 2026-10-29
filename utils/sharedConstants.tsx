export const versionList = {
  "learn": "",
  "recon": "v0.9",
  "changeblog": "",
  "algs": "v0.1",
}

export const highlightClass = 'text-dark bg-primary-100 backdrop-blur-xs caret-dark';

export const OG_PREVIEW_SCALE = 0.7;

export const OG_PREVIEW_SIZE = {
  width: 1200 * OG_PREVIEW_SCALE,
  height: 630 * OG_PREVIEW_SCALE,
};

export const editorAliases: Record<string, string[]> = {
  solution: ['alg'],
  scramble: ['setup'],
};

export const FEEDBACK_CATEGORY_ORDER = ['great', 'good', 'okay', 'bad'] as const;

export type FeedbackCategory = typeof FEEDBACK_CATEGORY_ORDER[number];

export const colorDict = {
  move: 'text-primary-100',
  comment: 'text-gray-500',
  space: 'text-primary-100',
  invalid: 'text-red-500',
  paren: 'text-paren',
  rep: 'text-paren',
  hashtag: 'text-orange-300',
  suggestion: 'text-dark_accent',
  highlight: highlightClass,
};

export const DEFAULT_CUBE_COLORS = {
  up: '#FFFFFF',     // white
  down: '#EEFF00',   // yellow
  front: '#3EF600',  // green
  back: '#2870FF',   // blue
  right: '#FF0000',  // red
  left: '#FFA914',   // orange
  eo: '#FF00FF',     // magenta
};

export type CubeColors = typeof DEFAULT_CUBE_COLORS;

export const DEFAULT_HINT_FACELETS_ELEVATION = 1.5;

export const DEFAULT_STICKER_SCALE = 0.995;

export const MIN_STICKER_SCALE = 0.5;