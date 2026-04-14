# RTTTL Web Audio Synth

This started as a fun side project more than 10 years ago, originally used to add a few sound effects to websites.
Now it has been revived into a complete TypeScript library with AI assistance, including a modern playground and a huge preset catalog ready to copy and play.

## Install

```bash
npm i web-rtttl-synth
```

## Quick Start (Facade API)

```ts
import {playRTTTL} from 'web-rtttl-synth';

const handle = await playRTTTL('Tune:d=4,o=5,b=160:c,e,g,c6', {
    oscillatorType: 'square',
    onStart: ({ bpm, noteCount }) => console.log('start', bpm, noteCount),
    onStop: ({ reason }) => console.log('stopped', reason),
    onEnded: ({ playedCount, totalNotes }) => console.log('done', playedCount, totalNotes),
});

// stop early if needed
handle.stop();
```

## Controller API (Advanced)

```ts
import {createSynth} from 'web-rtttl-synth';

const synth = createSynth();
synth.loadRTTTL('Nokia:d=4,o=5,b=180:e,d,f#,g#', {bpmOverride: 180});

const handle = await synth.play({
    oscillatorType: 'triangle',
    onNoteStart: ({ index, playedCount, remainingCount }) => console.log('note start', index, playedCount, remainingCount),
    onNoteEnd: ({ index, playedCount }) => console.log('note end', index, playedCount),
});

await handle.whenEnded;
synth.dispose();
```

## Utility APIs

- `parseRTTTL(text)` returns parsed note events.
- `extractRTTTLBpm(text)` returns the RTTTL `b=` value or `null`.
- `buildPlaybackTimeline(notes, bpm)` returns deterministic schedule points in seconds.

## Options

- `oscillatorType`: `'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'`
- `bpmOverride`: force BPM instead of RTTTL default.
- `envelope`: `{ attackSeconds, releaseSeconds, peakGain }`
- callbacks: `onStart`, `onStop`, `onNoteStart`, `onNoteEnd`, `onEnded`

## Browser Notes

- Requires a browser environment with `AudioContext`.
- Playback must be triggered from user interaction in most browsers.

## Local Development

```bash
npm install
npm run dev        # playground app
npm run build:lib  # ESM + CJS + .d.ts outputs
npm test
```

## Publishing

```bash
npm run build:lib
npm publish
```
