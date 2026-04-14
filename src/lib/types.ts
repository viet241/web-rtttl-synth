export type ExtendedOscillatorType = OscillatorType | 'noise';

export interface NoteEvent {
    pitchStr: string;
    startBeat: number;
    durationBeats: number;
}

export interface ParseRTTTLResult {
    title: string;
    notes: NoteEvent[];
    defaultBpm: number | null;
}

export interface EnvelopeOptions {
    attackSeconds?: number;
    releaseSeconds?: number;
    peakGain?: number;
}

export interface PlaybackStartMeta {
    bpm: number;
    noteCount: number;
    startTime: number;
}

export interface PlaybackStopMeta {
    reason: 'manual' | 'restart' | 'dispose';
}

export interface PlaybackProgressMeta {
    index: number;
    playedCount: number;
    remainingCount: number;
    totalNotes: number;
}

export interface PlaybackEndedMeta {
    playedCount: number;
    totalNotes: number;
}

export interface SynthPlayOptions {
    bpmOverride?: number;
    oscillatorType?: ExtendedOscillatorType;
    envelope?: EnvelopeOptions;
    onStart?: (meta: PlaybackStartMeta) => void;
    onStop?: (meta: PlaybackStopMeta) => void;
    onNoteStart?: (meta: PlaybackProgressMeta) => void;
    onNoteEnd?: (meta: PlaybackProgressMeta) => void;
    onEnded?: (meta: PlaybackEndedMeta) => void;
}

export interface SynthLoadOptions {
    bpmOverride?: number;
}

export interface PlaybackHandle {
    stop: () => void;
    dispose: () => void;
    whenEnded: Promise<void>;
}

export interface SynthController {
    loadRTTTL: (text: string, options?: SynthLoadOptions) => void;
    play: (options?: SynthPlayOptions) => Promise<PlaybackHandle>;
    stop: () => void;
    dispose: () => void;
    getLoadedNotes: () => NoteEvent[];
    getResolvedBpm: () => number;
}
