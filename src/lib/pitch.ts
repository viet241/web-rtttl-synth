const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = {
    DB: 'C#',
    EB: 'D#',
    GB: 'F#',
    AB: 'G#',
    BB: 'A#',
};

export function getFrequencyFromPitch(note: string): number {
    if (note.toUpperCase() === 'R') {
        return 0;
    }

    let pitchClass = note.slice(0, -1).toUpperCase();
    const octave = Number.parseInt(note.slice(-1), 10);
    if (FLAT_TO_SHARP[pitchClass]) {
        pitchClass = FLAT_TO_SHARP[pitchClass];
    }

    const noteIndex = NOTES.indexOf(pitchClass);
    if (noteIndex === -1 || Number.isNaN(octave)) {
        return 0;
    }

    const midiNumber = octave * 12 + noteIndex + 12;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
}
