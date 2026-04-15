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
    const [nokringModule, merwinsModule] = await Promise.all([
        import('./nokring-tunes.json'),
        import('./merwins-ringtons.json'),
    ]);

    const merged = [
        ...mapLibraryPresets(nokringModule.default.presets as LibraryPreset[]),
        ...mapLibraryPresets(merwinsModule.default.presets as LibraryPreset[]),
    ];
    const uniqueById = new Map<string, PlaygroundPreset>();
    merged.forEach((preset) => {
        if (!uniqueById.has(preset.id)) {
            uniqueById.set(preset.id, preset);
        }
    });

    return [...uniqueById.values()];
}
