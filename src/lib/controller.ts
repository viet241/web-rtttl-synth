import {WebAudioEngine} from './engine';
import {parseRTTTLWithMetadata} from './parser';
import type {PlaybackHandle, SynthController, SynthLoadOptions, SynthPlayOptions} from './types';

class SynthControllerImpl implements SynthController {
    private engine = new WebAudioEngine();
    private loadedNotes = parseRTTTLWithMetadata('').notes;
    private resolvedBpm = 120;
    private lastLoadText = '';

    loadRTTTL(text: string, options: SynthLoadOptions = {}): void {
        const parsed = parseRTTTLWithMetadata(text);
        this.loadedNotes = parsed.notes;
        this.resolvedBpm = options.bpmOverride ?? parsed.defaultBpm ?? 120;
        this.lastLoadText = text;
    }

    async play(options: SynthPlayOptions = {}): Promise<PlaybackHandle> {
        if (!this.lastLoadText) {
            throw new Error('No RTTTL has been loaded. Call loadRTTTL(text) before play().');
        }

        const bpm = options.bpmOverride ?? this.resolvedBpm;
        const whenEnded = this.engine.play(this.loadedNotes, bpm, options);
        return {
            stop: () => this.stop(),
            dispose: () => this.dispose(),
            whenEnded,
        };
    }

    stop(): void {
        this.engine.stop('manual');
    }

    dispose(): void {
        this.engine.stop('dispose');
    }

    getLoadedNotes() {
        return [...this.loadedNotes];
    }

    getResolvedBpm(): number {
        return this.resolvedBpm;
    }
}

export function createSynth(): SynthController {
    return new SynthControllerImpl();
}

export async function playRTTTL(rtttlText: string, options: SynthPlayOptions = {}): Promise<PlaybackHandle> {
    const synth = createSynth();
    synth.loadRTTTL(rtttlText, {bpmOverride: options.bpmOverride});
    return synth.play(options);
}
