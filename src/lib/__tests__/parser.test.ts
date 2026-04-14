import {describe, expect, it} from 'vitest';
import {extractRTTTLBpm, parseRTTTL, parseRTTTLWithMetadata} from '../parser';

describe('parseRTTTL', () => {
    it('parses valid RTTTL into sequential note events', () => {
        const notes = parseRTTTL('Tune:d=4,o=5,b=120:c,8d.,p,16e6');
        expect(notes).toHaveLength(4);
        expect(notes[0]).toEqual({pitchStr: 'C5', startBeat: 0, durationBeats: 1});
        expect(notes[1]).toEqual({pitchStr: 'D5', startBeat: 1, durationBeats: 0.75});
        expect(notes[2]).toEqual({pitchStr: 'R', startBeat: 1.75, durationBeats: 1});
        expect(notes[3]).toEqual({pitchStr: 'E6', startBeat: 2.75, durationBeats: 0.25});
    });

    it('returns empty notes for malformed RTTTL', () => {
        expect(parseRTTTL('invalid')).toEqual([]);
    });

    it('extracts metadata and bpm correctly', () => {
        const parsed = parseRTTTLWithMetadata('Song:d=8,o=4,b=180:a,b,c');
        expect(parsed.title).toBe('Song');
        expect(parsed.defaultBpm).toBe(180);
        expect(extractRTTTLBpm('Song:d=8,o=4,b=180:a,b,c')).toBe(180);
    });
});
