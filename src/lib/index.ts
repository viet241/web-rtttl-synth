export {createSynth, playRTTTL, warmupAudio} from './controller';
export {buildPlaybackTimeline} from './engine';
export {extractRTTTLBpm, parseRTTTL, parseRTTTLWithMetadata} from './parser';
export {getFrequencyFromPitch} from './pitch';
export type {
    EnvelopeOptions,
    ExtendedOscillatorType,
    NoteEvent,
    ParseRTTTLResult,
    PlaybackHandle,
    SynthController,
    SynthLoadOptions,
    SynthPlayOptions,
} from './types';
