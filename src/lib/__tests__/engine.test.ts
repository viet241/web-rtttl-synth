import {describe, expect, it} from 'vitest';
import {buildPlaybackTimeline} from '../engine';

describe('buildPlaybackTimeline', () => {
    it('builds deterministic scheduling points from bpm and beats', () => {
        const timeline = buildPlaybackTimeline(
            [
                {pitchStr: 'C5', startBeat: 0, durationBeats: 1},
                {pitchStr: 'D5', startBeat: 1.5, durationBeats: 0.5},
            ],
            120,
        );

        expect(timeline).toEqual([
            {index: 0, startSeconds: 0, durationSeconds: 0.5},
            {index: 1, startSeconds: 0.75, durationSeconds: 0.25},
        ]);
    });
});
