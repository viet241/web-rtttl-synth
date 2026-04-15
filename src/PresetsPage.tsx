import {useDeferredValue, useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {Grid, type CellComponentProps} from 'react-window';
import {createSynth} from './lib';
import type {ExtendedOscillatorType} from './lib';
import {BASE_PRESETS, loadExtraPresets} from './preset-data';
import type {PlaygroundPreset} from './preset-data';

type GridData = {
    presets: PlaygroundPreset[];
    copiedId: string | null;
    playingId: string | null;
    columnCount: number;
    onPlay: (preset: PlaygroundPreset) => void;
    onCopy: (preset: PlaygroundPreset) => void;
};

const ROW_HEIGHT = 160;
const CARD_MIN_WIDTH = 430;
const GRID_GAP = 10;

export default function PresetsPage() {
    const [presets, setPresets] = useState<PlaygroundPreset[]>(BASE_PRESETS);
    const [isExtraLoaded, setIsExtraLoaded] = useState(false);
    const [queryInput, setQueryInput] = useState('');
    const [query, setQuery] = useState('');
    const [minBpm, setMinBpm] = useState('');
    const [maxBpm, setMaxBpm] = useState('');
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [listSize, setListSize] = useState({height: 320, width: 320});
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const activeSynthRef = useRef<ReturnType<typeof createSynth> | null>(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const extraPresets = await loadExtraPresets();
            if (!active) {
                return;
            }
            setPresets((previous) => {
                const knownIds = new Set(previous.map((preset) => preset.id));
                const merged = [...previous];
                extraPresets.forEach((preset) => {
                    if (!knownIds.has(preset.id)) {
                        merged.push(preset);
                    }
                });
                return merged;
            });
            setIsExtraLoaded(true);
        };
        void load();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setQuery(queryInput), 180);
        return () => window.clearTimeout(timeoutId);
    }, [queryInput]);

    const deferredQuery = useDeferredValue(query);

    const availableCollections = useMemo(() => {
        const unique = new Set<string>();
        presets.forEach((preset) => unique.add(preset.collection));
        return [...unique].sort((a, b) => a.localeCompare(b));
    }, [presets]);

    const toggleCollection = (collection: string) => {
        setSelectedCollections((previous) =>
            previous.includes(collection)
                ? previous.filter((item) => item !== collection)
                : [...previous, collection],
        );
    };

    const filtered = useMemo(() => {
        const normalized = deferredQuery.trim().toLowerCase();
        const min = minBpm ? Number.parseInt(minBpm, 10) : Number.NEGATIVE_INFINITY;
        const max = maxBpm ? Number.parseInt(maxBpm, 10) : Number.POSITIVE_INFINITY;
        return presets.filter((preset) => {
            const matchedName = !normalized || preset.name.toLowerCase().includes(normalized);
            const matchedBpm = preset.bpm >= min && preset.bpm <= max;
            const matchedCollection =
                selectedCollections.length === 0 || selectedCollections.includes(preset.collection);
            return matchedName && matchedBpm && matchedCollection;
        });
    }, [deferredQuery, maxBpm, minBpm, presets, selectedCollections]);

    useEffect(() => {
        if (!listContainerRef.current) {
            return;
        }
        const element = listContainerRef.current;
        const updateSize = () => {
            setListSize({
                height: Math.max(160, element.clientHeight),
                width: Math.max(260, element.clientWidth),
            });
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        return () => {
            activeSynthRef.current?.dispose();
            activeSynthRef.current = null;
        };
    }, []);

    const copyRTTTL = async (preset: PlaygroundPreset) => {
        await navigator.clipboard.writeText(preset.notes);
        setCopiedId(preset.id);
        window.setTimeout(() => setCopiedId(null), 1200);
    };

    const playPreset = async (preset: PlaygroundPreset) => {
        activeSynthRef.current?.dispose();
        const synth = createSynth();
        activeSynthRef.current = synth;
        setPlayingId(preset.id);
        synth.loadRTTTL(preset.notes, {bpmOverride: preset.bpm});
        const handle = await synth.play({
            oscillatorType: (preset.type ?? 'sine') as ExtendedOscillatorType,
            onStop: () => {
                if (activeSynthRef.current === synth) {
                    setPlayingId(null);
                }
            },
            onEnded: () => {
                if (activeSynthRef.current === synth) {
                    setPlayingId(null);
                    activeSynthRef.current = null;
                }
            },
        });
        void handle.whenEnded;
    };

    const columnCount = Math.max(1, Math.floor((listSize.width + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)));
    const columnWidth = Math.floor((listSize.width - GRID_GAP * (columnCount - 1)) / columnCount);
    const rowCount = Math.ceil(filtered.length / columnCount);

    const gridData: GridData = {
        presets: filtered,
        copiedId,
        playingId,
        columnCount,
        onPlay: (preset) => void playPreset(preset),
        onCopy: (preset) => void copyRTTTL(preset),
    };

    return (
        <div className="h-screen p-4 overflow-hidden">
            <div className="max-w-6xl mx-auto scifi-panel p-5 flex flex-col gap-4 h-[calc(100vh-2rem)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[rgba(0,243,255,0.2)] pb-3">
                    <h1 className="mono-text text-lg text-[#e0f7fa] uppercase">Preset Catalog</h1>
                    <Link to="/" className="mono-text text-xs text-[#00f3ff] uppercase border border-[rgba(0,243,255,0.35)] px-2 py-1 rounded">
                        Back To Playground
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        value={queryInput}
                        onChange={(event) => setQueryInput(event.target.value)}
                        className="bg-[#010204] border border-[rgba(0,243,255,0.2)] rounded p-2 mono-text text-xs text-[#e0f7fa]"
                        placeholder="Search by name"
                    />
                    <input
                        value={minBpm}
                        onChange={(event) => setMinBpm(event.target.value)}
                        className="bg-[#010204] border border-[rgba(0,243,255,0.2)] rounded p-2 mono-text text-xs text-[#e0f7fa]"
                        placeholder="Min BPM"
                        type="number"
                    />
                    <input
                        value={maxBpm}
                        onChange={(event) => setMaxBpm(event.target.value)}
                        className="bg-[#010204] border border-[rgba(0,243,255,0.2)] rounded p-2 mono-text text-xs text-[#e0f7fa]"
                        placeholder="Max BPM"
                        type="number"
                    />
                    <div className="mono-text text-[11px] text-[#4a7c8c] uppercase flex items-center">
                        {filtered.length}/{presets.length} presets {!isExtraLoaded ? '(loading extra libraries...)' : ''}
                    </div>
                </div>
                <div className="bg-[rgba(0,243,255,0.02)] border border-[rgba(0,243,255,0.15)] rounded p-3">
                    <div className="mono-text text-[11px] text-[#4a7c8c] uppercase mb-2">
                        Collection Filter (multi-select)
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {availableCollections.map((collection) => (
                            <label
                                key={collection}
                                className="mono-text text-[11px] text-[#e0f7fa] flex items-center gap-2 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCollections.includes(collection)}
                                    onChange={() => toggleCollection(collection)}
                                    className="accent-[#00f3ff]"
                                />
                                <span>{collection}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div ref={listContainerRef} className="flex-1 overflow-hidden">
                    <Grid
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                        rowCount={rowCount}
                        rowHeight={ROW_HEIGHT}
                        cellComponent={PresetCell}
                        cellProps={gridData}
                        style={{height: listSize.height, width: listSize.width}}
                    >
                    </Grid>
                </div>
            </div>
        </div>
    );
}

function PresetCell({columnIndex, rowIndex, style, ...data}: CellComponentProps<GridData>) {
    const index = rowIndex * data.columnCount + columnIndex;
    const preset = data.presets[index];
    if (!preset) {
        return null;
    }

    return (
        <div
            style={{
                ...style,
                paddingRight: columnIndex < data.columnCount - 1 ? GRID_GAP : 0,
                paddingBottom: GRID_GAP,
                boxSizing: 'border-box',
            }}
        >
            <div className="bg-[#010204] border border-[rgba(0,243,255,0.2)] rounded p-3 flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between gap-2">
                    <div className="mono-text text-sm text-[#00f3ff] truncate">{preset.name}</div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => data.onPlay(preset)}
                            className="mono-text text-[10px] uppercase border border-[rgba(0,243,255,0.35)] rounded px-2 py-1 text-[#00f3ff]"
                        >
                            {data.playingId === preset.id ? 'Playing...' : 'Play'}
                        </button>
                        <button
                            onClick={() => data.onCopy(preset)}
                            className="mono-text text-[10px] uppercase border border-[rgba(0,243,255,0.35)] rounded px-2 py-1 text-[#00f3ff]"
                        >
                            {data.copiedId === preset.id ? 'Copied' : 'Copy RTTTL'}
                        </button>
                    </div>
                </div>
                <div className="mono-text text-[10px] text-[#4a7c8c] uppercase">
                    {`BPM ${preset.bpm} | ${preset.collection}`}
                </div>
                <div className="mono-text text-xs text-[#e0f7fa] break-words line-clamp-2">
                    {preset.notes}
                </div>
            </div>
        </div>
    );
}
