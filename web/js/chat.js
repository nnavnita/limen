// Idle chatter for the people on a break at the water cooler.

import { hashString } from './zones.js';

// Each entry is one short exchange: opener, then reply.
const EXCHANGES = [
  ['busy one today?', 'bit quiet, actually'],
  ['waiting on a reply', "aren't we all"],
  ["how's the branch?", "don't ask"],
  ['seen the test suite?', 'wish I hadn’t'],
  ['any word from upstairs?', 'not a peep'],
  ['coffee’s gone cold', 'it always does'],
  ['what are you building?', 'no idea yet'],
  ['long day', 'long week'],
  ['merge conflicts?', 'three of them'],
  ['nice and green in prod', "don't jinx it"],
  ['did you read the diff?', 'all 900 lines'],
  ['they went quiet on me', 'mine too'],
  ['nearly done, I think', 'famous last words'],
  ['this one’s a rabbit hole', 'they all are'],
  ['fancy a refactor?', 'absolutely not'],
];

const SOLO = [
  ['*sips water*', null],
  ['just me then', null],
  ['…', null],
  ['nice plant', null],
];

const EXCHANGE_MS = 9000;   // how long a pair stays on one exchange
const TURN_MS = 4500;       // opener, then reply
const PAIR_STAGGER = 2600;  // offset each pair so they don't all talk at once

/**
 * Pair people up so each exchange has two sides. Whoever is left over
 * gets a line to themselves rather than talking to nobody.
 */
export function chatter(sessions, now) {
  const ordered = [...sessions].sort((a, b) => a.id.localeCompare(b.id));
  const lines = new Map();

  for (let i = 0; i < ordered.length; i += 2) {
    const pair = i / 2;
    const clock = now + pair * PAIR_STAGGER;
    const round = Math.floor(clock / EXCHANGE_MS);
    const turn = Math.floor((clock % EXCHANGE_MS) / TURN_MS);   // 0 = opener, 1 = reply
    const lift = (pair % 2) * 19;   // a full bubble height, so neighbours never overlap

    const first = ordered[i];
    const second = ordered[i + 1];

    if (!second) {
      const [line] = SOLO[hashString(first.id + round) % SOLO.length];
      lines.set(first.id, { text: line, lift });
      continue;
    }

    const [opener, reply] = EXCHANGES[hashString(first.id + second.id + round) % EXCHANGES.length];
    if (turn === 0) lines.set(first.id, { text: opener, lift });
    else lines.set(second.id, { text: reply, lift });
  }
  return lines;
}
