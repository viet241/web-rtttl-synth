import {extractRTTTLBpm} from './lib';
import type {ExtendedOscillatorType} from './lib';
import library from './library.json';

export type LibraryPreset = {
    id: string;
    name: string;
    rtttl: string;
    bpm?: number;
    type?: ExtendedOscillatorType;
    collection?: string;
};

export type PlaygroundPreset = {
    id: string;
    name: string;
    notes: string;
    bpm: number;
    type: ExtendedOscillatorType;
    collection: string;
};

export function mapLibraryPresets(rawPresets: LibraryPreset[]): PlaygroundPreset[] {
    return rawPresets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        notes: preset.rtttl,
        bpm: preset.bpm ?? extractRTTTLBpm(preset.rtttl) ?? 120,
        type: preset.type ?? 'sine',
        collection: preset.collection ?? (preset.id.startsWith('featured-') ? 'featured' : 'library'),
    }));
}

export const BASE_PRESETS: PlaygroundPreset[] = mapLibraryPresets(library.presets as LibraryPreset[]);

export async function loadExtraPresets(): Promise<PlaygroundPreset[]> {
    const module = await import('./nokring-tunes.json');
    return mapLibraryPresets(module.default.presets as LibraryPreset[]);
}
