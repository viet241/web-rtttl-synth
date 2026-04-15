import {getFrequencyFromPitch} from './pitch';
import {getSharedAudioContext, hasWarmedUpAudioContext} from './audio-context';
import type {ExtendedOscillatorType, NoteEvent, SynthPlayOptions} from './types';

interface ScheduledPoint {
    index: number;
    startSeconds: number;
    durationSeconds: number;
}

export function buildPlaybackTimeline(notes: NoteEvent[], bpm: number): ScheduledPoint[] {
    const beatDuration = 60 / bpm;
    return notes.map((event, index) => ({
        index,
        startSeconds: event.startBeat * beatDuration,
        durationSeconds: event.durationBeats * beatDuration,
    }));
}

export class WebAudioEngine {
    private activeSources: AudioScheduledSourceNode[] = [];
    private activeTimeouts: number[] = [];
    private endResolver: (() => void) | null = null;
    private currentPlayOptions: SynthPlayOptions | null = null;
    private isFinishingNaturally = false;
    private hasStartedPlayback = false;

    private ensureContext(): AudioContext {
        return getSharedAudioContext();
    }

    private scheduleSource(
        ctx: AudioContext,
        frequency: number,
        startTime: number,
        durationSeconds: number,
        oscillatorType: ExtendedOscillatorType,
        options: SynthPlayOptions,
    ): void {
        if (frequency <= 0) {
            return;
        }

        const attack = options.envelope?.attackSeconds ?? 0.02;
        const release = options.envelope?.releaseSeconds ?? 0.05;
        const peakGain = options.envelope?.peakGain ?? 0.3;

        const gainNode = ctx.createGain();
        let source: AudioScheduledSourceNode;

        if (oscillatorType === 'noise') {
            const bufferSize = Math.ceil(ctx.sampleRate * durationSeconds);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i += 1) {
                data[i] = Math.random() * 2 - 1;
            }
            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = frequency;
            filter.Q.value = 1.5;
            noiseSource.connect(filter);
            filter.connect(gainNode);
            source = noiseSource;
        } else {
            const oscillator = ctx.createOscillator();
            oscillator.type = oscillatorType;
            oscillator.frequency.value = frequency;
            oscillator.connect(gainNode);
            source = oscillator;
        }

        const releaseStartTime = Math.max(startTime + attack, startTime + durationSeconds - release);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack);
        gainNode.gain.setValueAtTime(peakGain, releaseStartTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + durationSeconds);

        gainNode.connect(ctx.destination);
        source.start(startTime);
        source.stop(startTime + durationSeconds);

        source.onended = () => {
            this.activeSources = this.activeSources.filter((item) => item !== source);
        };
        this.activeSources.push(source);
    }

    stop(reason: 'manual' | 'restart' | 'dispose' = 'manual'): void {
        const shouldEmitStop = this.hasStartedPlayback && !this.isFinishingNaturally;
        this.activeSources.forEach((source) => {
            try {
                source.stop();
            } catch {
                // Source may already be ended.
            }
            try {
                source.disconnect();
            } catch {
                // Nothing to disconnect.
            }
        });
        this.activeSources = [];
        this.activeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
        this.activeTimeouts = [];
        if (this.endResolver) {
            this.endResolver();
            this.endResolver = null;
        }
        if (shouldEmitStop) {
            this.currentPlayOptions?.onStop?.({reason});
        }
        this.currentPlayOptions = null;
        this.isFinishingNaturally = false;
        this.hasStartedPlayback = false;
    }

    async play(notes: NoteEvent[], bpm: number, options: SynthPlayOptions = {}): Promise<void> {
        this.stop('restart');
        const ctx = this.ensureContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        this.currentPlayOptions = options;
        const oscillatorType = options.oscillatorType ?? 'sine';
        const startOffsetSeconds = hasWarmedUpAudioContext() ? 0.03 : 0.08;
        const startAt = ctx.currentTime + startOffsetSeconds;
        const timeline = buildPlaybackTimeline(notes, bpm);
        const totalNotes = notes.length;
        let playedCount = 0;
        let endedCount = 0;
        let maxSeconds = 0;

        if (options.onStart) {
            const startTimeoutId = window.setTimeout(() => {
                options.onStart?.({
                    bpm,
                    noteCount: notes.length,
                    startTime: startAt,
                });
                this.hasStartedPlayback = true;
            }, Math.max(0, (startAt - ctx.currentTime) * 1000));
            this.activeTimeouts.push(startTimeoutId);
        } else {
            this.hasStartedPlayback = true;
        }

        timeline.forEach((point) => {
            const note = notes[point.index];
            const frequency = getFrequencyFromPitch(note.pitchStr);
            const noteStartTime = startAt + point.startSeconds;
            this.scheduleSource(ctx, frequency, noteStartTime, point.durationSeconds, oscillatorType, options);
            maxSeconds = Math.max(maxSeconds, point.startSeconds + point.durationSeconds);

            if (options.onNoteStart) {
                const startTimeoutId = window.setTimeout(() => {
                    playedCount += 1;
                    options.onNoteStart?.({
                        index: point.index,
                        playedCount,
                        remainingCount: Math.max(0, totalNotes - playedCount),
                        totalNotes,
                    });
                }, Math.max(0, (noteStartTime - ctx.currentTime) * 1000));
                this.activeTimeouts.push(startTimeoutId);
            }

            if (options.onNoteEnd) {
                const endTimeoutId = window.setTimeout(() => {
                    endedCount += 1;
                    options.onNoteEnd?.({
                        index: point.index,
                        playedCount,
                        remainingCount: Math.max(0, totalNotes - playedCount),
                        totalNotes,
                    });
                }, Math.max(0, (noteStartTime + point.durationSeconds - ctx.currentTime) * 1000));
                this.activeTimeouts.push(endTimeoutId);
            }
        });

        const whenEnded = new Promise<void>((resolve) => {
            this.endResolver = resolve;
            const timeoutId = window.setTimeout(() => {
                this.isFinishingNaturally = true;
                this.endResolver = null;
                options.onEnded?.({
                    playedCount: Math.max(playedCount, endedCount),
                    totalNotes,
                });
                resolve();
                this.currentPlayOptions = null;
                this.hasStartedPlayback = false;
                this.isFinishingNaturally = false;
            }, Math.max(0, (startAt + maxSeconds - ctx.currentTime) * 1000));
            this.activeTimeouts.push(timeoutId);
        });

        return whenEnded;
    }
}
