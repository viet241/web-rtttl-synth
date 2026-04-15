# RTTTL Web Audio Synth

This started as a fun side project more than 10 years ago, originally used to add a few sound effects to websites.
Now it has been revived into a complete TypeScript library with AI assistance, plus a modern Playground that includes a huge built-in RTTTL preset library ready to copy and play.
Not sure if anyone will use this project, but I'll publish it just for fun.

## Screenshot
![Web RTTTL Synth Playground screenshot](https://github.com/user-attachments/assets/e8e3994f-6458-4911-b75d-c172155a13c4)

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

## Credits
Some preset collections in the Playground were curated and adapted from these community resources:
- RTTTL parsing reference and inspiration:
https://1j01.github.io/rtttl.js/
- Public ringtone browsing source:
https://ringtone.vulc.in/
- Large ringtone text dataset source:
https://microblocks.fun/mbtest/NokringTunes.txt
