import {useEffect, useMemo, useRef, useState} from 'react';
import {Activity, Play, Square, Github} from 'lucide-react';
import {Link} from 'react-router-dom';
import {createSynth, extractRTTTLBpm, parseRTTTL, warmupAudio} from './lib';
import type {ExtendedOscillatorType} from './lib';
import {BASE_PRESETS, loadExtraPresets} from './preset-data';
import type {PlaygroundPreset} from './preset-data';

export default function App() {
    const [presets, setPresets] = useState<PlaygroundPreset[]>(BASE_PRESETS);
    const [isLibrary2Loaded, setIsLibrary2Loaded] = useState(false);
    const [notes, setNotes] = useState(BASE_PRESETS[0].notes);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(BASE_PRESETS[0].bpm);
    const [oscillatorType, setOscillatorType] = useState<ExtendedOscillatorType>(BASE_PRESETS[0].type);
    const [activeNoteIndices, setActiveNoteIndices] = useState<Set<number>>(new Set());
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(BASE_PRESETS[0].id);
    const [presetQuery, setPresetQuery] = useState('');
    const [progress, setProgress] = useState({played: 0, total: 0});
    const [lastStartMeta, setLastStartMeta] = useState<{bpm: number; noteCount: number} | null>(null);
    const [lastStopReason, setLastStopReason] = useState<string | null>(null);
    const [lastEndedMeta, setLastEndedMeta] = useState<{playedCount: number; totalNotes: number} | null>(null);
    const [lastNoteStartIndex, setLastNoteStartIndex] = useState<number | null>(null);
    const [lastNoteEndIndex, setLastNoteEndIndex] = useState<number | null>(null);

    const synthRef = useRef(createSynth());

    const stopAudio = () => {
        synthRef.current.stop();
        setIsPlaying(false);
        setActiveNoteIndices(new Set());
        setProgress({played: 0, total: 0});
    };

    const playAudio = async () => {
        setIsPlaying(true);
        setActiveNoteIndices(new Set());
        setProgress({played: 0, total: parseRTTTL(notes).length});
        setLastStopReason(null);
        setLastEndedMeta(null);
        synthRef.current.loadRTTTL(notes, {bpmOverride: bpm});
        const handle = await synthRef.current.play({
            oscillatorType,
            onStart: ({noteCount}) => {
                setProgress({played: 0, total: noteCount});
                setLastStartMeta({bpm, noteCount});
            },
            onStop: ({reason}) => {
                setProgress({played: 0, total: 0});
                setLastStopReason(reason);
            },
            onNoteStart: ({index}) => {
                setActiveNoteIndices((previous) => {
                    const next = new Set(previous);
                    next.add(index);
                    return next;
                });
                setLastNoteStartIndex(index);
            },
            onNoteEnd: ({index, playedCount, totalNotes}) => {
                setActiveNoteIndices((previous) => {
                    const next = new Set(previous);
                    next.delete(index);
                    return next;
                });
                setProgress({played: playedCount, total: totalNotes});
                setLastNoteEndIndex(index);
            },
            onEnded: ({playedCount, totalNotes}) => {
                setIsPlaying(false);
                setActiveNoteIndices(new Set());
                setProgress({played: playedCount, total: totalNotes});
                setLastEndedMeta({playedCount, totalNotes});
            },
        });
        void handle.whenEnded;
    };

    useEffect(() => {
        return () => synthRef.current.dispose();
    }, []);

    useEffect(() => {
        const warmupOnce = () => {
            void warmupAudio();
        };

        document.addEventListener('pointerdown', warmupOnce, {once: true});
        return () => {
            document.removeEventListener('pointerdown', warmupOnce);
        };
    }, []);

    useEffect(() => {
        let active = true;

        const loadLibrary2 = async () => {
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
            setIsLibrary2Loaded(true);
        };

        void loadLibrary2();

        return () => {
            active = false;
        };
    }, []);

    const handlePresetSelect = (preset: PlaygroundPreset) => {
        setSelectedPresetId(preset.id);
        setNotes(preset.notes);
        setBpm(preset.bpm);
        setOscillatorType(preset.type);
    };

    const filteredPresets = useMemo(() => {
        const query = presetQuery.trim().toLowerCase();
        if (!query) {
            return presets;
        }
        return presets.filter((preset) => preset.name.toLowerCase().includes(query));
    }, [presetQuery, presets]);

    const groupedPresets = useMemo(() => {
        const groups = new Map<string, PlaygroundPreset[]>();
        filteredPresets.forEach((preset) => {
            if (!groups.has(preset.collection)) {
                groups.set(preset.collection, []);
            }
            groups.get(preset.collection)?.push(preset);
        });

        const keys = [...groups.keys()].sort((a, b) => {
            if (a === 'featured') {
                return -1;
            }
            if (b === 'featured') {
                return 1;
            }
            if (a === 'library') {
                return 1;
            }
            if (b === 'library') {
                return -1;
            }
            return a.localeCompare(b);
        });

        return keys.map((collection) => ({
            collection,
            presets: groups.get(collection) ?? [],
        }));
    }, [filteredPresets]);

    const formatCollectionLabel = (collection: string): string => {
        return collection
            .split(/[\s_-]+/)
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };
    const parsedEvents = parseRTTTL(notes);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <a
                href="https://github.com/viet241/web-rtttl-synth"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 fixed top-4 right-4 z-20 mono-text text-[10px] uppercase px-3 py-1.5 rounded border border-[rgba(0,243,255,0.35)] text-[#00f3ff] bg-[rgba(1,2,4,0.8)] hover:bg-[rgba(0,243,255,0.15)] hover:shadow-[0_0_10px_rgba(0,243,255,0.35)] transition-all"
            >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
            </a>
            <div className="scifi-panel w-full max-w-3xl p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(0,243,255,0.2)] pb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-[#00f3ff]" />
            <h1 className="text-xl font-medium tracking-widest uppercase text-[#e0f7fa] drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">Web Audio Synth</h1>
          </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.8)]' : 'bg-[#ff003c] shadow-[0_0_10px_rgba(255,0,60,0.6)]'}`}></div>
                        <span className="mono-text text-xs text-[#4a7c8c] uppercase">{isPlaying ? 'SYS.ONLINE' : 'SYS.STANDBY'}</span>
                    </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Input Area */}
          <div className="xl:col-span-8 flex flex-col gap-4">
            {/* Data Input First */}
            <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <label className="mono-text text-xs text-[#4a7c8c] uppercase">Data Input (RTTTL)</label>
                            </div>
              <textarea 
                value={notes}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setNotes(value);
                                    setSelectedPresetId(null);
                                    const extractedBpm = extractRTTTLBpm(value);
                                    if (extractedBpm) {
                                        setBpm(extractedBpm);
                                    }
                                }}
                className="w-full h-32 bg-[#010204] border border-[rgba(0,243,255,0.3)] rounded p-3 mono-text text-sm text-[#e0f7fa] focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] resize-none whitespace-pre-wrap"
                spellCheck="false"
                placeholder="Enter RTTTL format (e.g. Name:d=4,o=5,b=160:c.6,e6,f#6)"
              />
            </div>

            <div className="mono-text text-[10px] text-[#4a7c8c] uppercase">
              Select a preset from the library below or edit RTTTL directly.
            </div>

            <div className="flex flex-col bg-[rgba(0,243,255,0.02)] p-3 rounded border border-[rgba(0,243,255,0.1)] h-[280px]">
              <div className="flex items-center justify-between gap-2">
                <label className="mono-text text-xs text-[#4a7c8c] uppercase">Preset Library</label>
                <Link
                    to="/presets"
                    className="mono-text text-[10px] text-[#00f3ff] uppercase border border-[rgba(0,243,255,0.3)] rounded px-2 py-1 inline-block w-fit hover:bg-[rgba(0,243,255,0.15)]"
                >
                    Open Preset Catalog
                </Link>
              </div>
              <input
                value={presetQuery}
                onChange={(event) => setPresetQuery(event.target.value)}
                className="mt-2 w-full bg-[#010204] border border-[rgba(0,243,255,0.2)] rounded p-2 mono-text text-xs text-[#e0f7fa] focus:outline-none focus:border-[#00f3ff]"
                placeholder="Search preset..."
              />
              <div className="mono-text text-[10px] text-[#4a7c8c] uppercase mt-2">
                Showing {filteredPresets.length}/{presets.length} presets
                {!isLibrary2Loaded ? ' (loading extra libraries...)' : ''}
              </div>

              <div className="mt-3 flex-1 overflow-y-auto overflow-x-hidden pr-1 flex flex-col gap-2">
                {groupedPresets.map((group, groupIndex) => (
                    <div key={group.collection} className="flex flex-col gap-2">
                        <div className={`mono-text text-[10px] uppercase ${group.collection === 'featured' ? 'text-[#00f3ff]' : 'text-[#4a7c8c]'} ${groupIndex > 0 ? 'mt-2' : ''}`}>
                            {formatCollectionLabel(group.collection)}
                        </div>
                        {group.presets.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => handlePresetSelect(preset)}
                                className={`w-full text-left mono-text text-[11px] px-2 py-1.5 rounded border break-words ${
                                    selectedPresetId === preset.id
                                        ? 'bg-[rgba(0,243,255,0.2)] text-[#00f3ff] border-[#00f3ff]'
                                        : 'bg-[#010204] text-[#4a7c8c] border-[rgba(0,243,255,0.2)] hover:text-[#00f3ff] hover:border-[rgba(0,243,255,0.5)]'
                                }`}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="xl:col-span-4 flex flex-col gap-4 bg-[rgba(0,243,255,0.02)] p-4 rounded border border-[rgba(0,243,255,0.1)]">
            <div className="flex flex-col gap-2">
              <label className="mono-text text-xs text-[#4a7c8c] uppercase flex justify-between">
                <span>Tempo (BPM)</span>
                <span className="text-[#00f3ff]">{bpm}</span>
              </label>
              <input 
                type="range" 
                min="40" 
                max="240" 
                value={bpm} 
                                onChange={(event) => {
                                    setBpm(Number.parseInt(event.target.value, 10));
                                    setSelectedPresetId(null);
                                }}
                className="w-full accent-[#00f3ff]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="mono-text text-xs text-[#4a7c8c] uppercase">Waveform</label>
              <div className="grid grid-cols-2 gap-2">
                {['sine', 'square', 'sawtooth', 'triangle', 'noise'].map(type => (
                  <button
                    key={type}
                                    onClick={() => {
                                        setOscillatorType(type as ExtendedOscillatorType);
                                        setSelectedPresetId(null);
                                    }}
                    className={`mono-text text-[10px] uppercase py-1.5 rounded border transition-all ${
                      oscillatorType === type 
                        ? 'bg-[rgba(0,243,255,0.2)] text-[#00f3ff] border-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.3)]' 
                        : 'bg-[#010204] text-[#4a7c8c] border-[rgba(0,243,255,0.2)] hover:border-[rgba(0,243,255,0.5)] hover:text-[#00f3ff]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Transport Controls */}
            <div className="mt-auto pt-4 flex gap-2 border-t border-[rgba(0,243,255,0.2)]">
              <button 
                onClick={playAudio}
                className={`flex-1 btn-scifi py-2 flex items-center justify-center gap-2 ${isPlaying ? 'bg-[rgba(0,243,255,0.2)] shadow-[0_0_15px_rgba(0,243,255,0.5)]' : ''}`}
              >
                <Play className="w-4 h-4" fill={isPlaying ? "currentColor" : "none"} />
                <span className="mono-text text-xs uppercase font-bold">{isPlaying ? 'Restart' : 'Play'}</span>
              </button>
              <button 
                onClick={stopAudio}
                disabled={!isPlaying}
                className="flex-1 btn-scifi py-2 flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:cursor-not-allowed !border-[#ff003c] !text-[#ff003c] hover:!bg-[rgba(255,0,60,0.2)] hover:!shadow-[0_0_15px_rgba(255,0,60,0.5)]"
              >
                <Square className="w-4 h-4" fill="currentColor" />
                <span className="mono-text text-xs uppercase font-bold">Stop</span>
              </button>
            </div>
          </div>

        </div>

        {/* Screen / Visualizer */}
        <div className="scifi-screen p-4 min-h-[120px] flex flex-wrap gap-2 content-start">
          <div className="w-full mb-2 flex flex-wrap items-center gap-2">
            <span className="mono-text text-[10px] text-[#4a7c8c] uppercase">
              Callback Monitor
            </span>
            <span className="mono-text text-[10px] px-2 py-0.5 rounded border border-[rgba(0,243,255,0.25)] text-[#00f3ff]">
              {`played ${progress.played}/${progress.total}`}
            </span>
            <span className="mono-text text-[10px] px-2 py-0.5 rounded border border-[rgba(0,243,255,0.25)] text-[#4a7c8c]">
              {`onStart ${lastStartMeta ? `${lastStartMeta.noteCount} notes @ ${lastStartMeta.bpm} bpm` : '-'}`}
            </span>
            <span className="mono-text text-[10px] px-2 py-0.5 rounded border border-[rgba(0,243,255,0.25)] text-[#4a7c8c]">
              {`onNoteStart ${lastNoteStartIndex ?? '-'}`}
            </span>
            <span className="mono-text text-[10px] px-2 py-0.5 rounded border border-[rgba(0,243,255,0.25)] text-[#4a7c8c]">
              {`onNoteEnd ${lastNoteEndIndex ?? '-'}`}
            </span>
            <span className="mono-text text-[10px] px-2 py-0.5 rounded border border-[rgba(0,243,255,0.25)] text-[#4a7c8c]">
              {`onStop ${lastStopReason ?? '-'}`}
            </span>
            <span className="mono-text text-[10px] px-2 py-0.5 rounded border border-[rgba(0,243,255,0.25)] text-[#4a7c8c]">
              {`onEnded ${lastEndedMeta ? `${lastEndedMeta.playedCount}/${lastEndedMeta.totalNotes}` : '-'}`}
            </span>
          </div>
          {parsedEvents.length === 0 && (
            <span className="mono-text text-[#4a7c8c] text-sm animate-pulse">AWAITING INPUT DATA...</span>
          )}
          {parsedEvents.map((event, idx) => (
            <div 
              key={idx}
              className={`note-badge mono-text text-xs px-2 py-1 rounded border ${
                activeNoteIndices.has(idx)
                  ? 'bg-[#00f3ff] text-black border-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.8)] scale-110 z-10' 
                  : 'bg-[#010204] text-[#4a7c8c] border-[rgba(0,243,255,0.2)]'
              }`}
            >
              {event.pitchStr}-{event.durationBeats}
            </div>
          ))}
        </div>
                <div className="scifi-screen p-4">
                    <p className="mono-text text-xs text-[#4a7c8c]">
                        npm i web-rtttl-synth
                    </p>
                    <p className="mono-text text-xs text-[#4a7c8c] mt-1">
                        import {'{ createSynth, playRTTTL }'} from 'web-rtttl-synth'
                    </p>
                </div>
            </div>
        </div>
    );
}
