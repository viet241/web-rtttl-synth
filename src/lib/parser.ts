import type {NoteEvent, ParseRTTTLResult} from './types';

export function parseRTTTL(rtttl: string): NoteEvent[] {
    return parseRTTTLWithMetadata(rtttl).notes;
}

export function extractRTTTLBpm(rtttl: string): number | null {
    return parseRTTTLWithMetadata(rtttl).defaultBpm;
}

export function parseRTTTLWithMetadata(rtttl: string): ParseRTTTLResult {
    const parts = rtttl.split(':');
    if (parts.length !== 3) {
        return {
            title: '',
            notes: [],
            defaultBpm: null,
        };
    }

    const title = parts[0].trim();
    const defaultsStr = parts[1].trim();
    const notesStr = parts[2].trim();

    let defaultDuration = 4;
    let defaultOctave = 5;
    let defaultBpm: number | null = null;

    defaultsStr.split(',').forEach((definition) => {
        const [keyRaw, valueRaw] = definition.split('=');
        const key = keyRaw?.trim().toLowerCase();
        const value = Number.parseInt(valueRaw?.trim() ?? '', 10);
        if (!key || Number.isNaN(value)) {
            return;
        }

        if (key === 'd') {
            defaultDuration = value;
        } else if (key === 'o') {
            defaultOctave = value;
        } else if (key === 'b') {
            defaultBpm = value;
        }
    });

    const events: NoteEvent[] = [];
    let currentBeat = 0;

    notesStr.split(',').forEach((tokenRaw) => {
        const token = tokenRaw.trim().toLowerCase();
        if (!token) {
            return;
        }

        const match = token.match(/^(\d+)?([a-g]|p)(#)?(\.)?(\d)?(\.)?$/);
        if (!match) {
            return;
        }

        const durationValue = match[1] ? Number.parseInt(match[1], 10) : defaultDuration;
        const note = match[2];
        const sharp = match[3] ?? '';
        const isDotted = match[4] === '.' || match[6] === '.';
        const octave = match[5] ? Number.parseInt(match[5], 10) : defaultOctave;

        let durationBeats = 4 / durationValue;
        if (isDotted) {
            durationBeats *= 1.5;
        }

        const pitchStr = note === 'p' ? 'R' : `${note.toUpperCase()}${sharp}${octave}`;
        events.push({
            pitchStr,
            startBeat: currentBeat,
            durationBeats,
        });
        currentBeat += durationBeats;
    });

    return {
        title,
        notes: events,
        defaultBpm,
    };
}
