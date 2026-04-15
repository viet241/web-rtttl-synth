let sharedAudioContext: AudioContext | null = null;
let hasWarmAudioContext = false;
let warmupInFlight: Promise<void> | null = null;

function getAudioContextCtor(): typeof AudioContext {
    const ctor = window.AudioContext || (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!ctor) {
        throw new Error('Web Audio API is not available in this environment.');
    }
    return ctor;
}

export function getSharedAudioContext(): AudioContext {
    if (!sharedAudioContext) {
        const Ctor = getAudioContextCtor();
        sharedAudioContext = new Ctor();
    }
    return sharedAudioContext;
}

export async function warmupAudioContext(): Promise<void> {
    if (hasWarmAudioContext) {
        return;
    }
    if (warmupInFlight) {
        return warmupInFlight;
    }

    warmupInFlight = (async () => {
        const ctx = getSharedAudioContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        hasWarmAudioContext = true;
    })();

    try {
        await warmupInFlight;
    } finally {
        warmupInFlight = null;
    }
}

export function hasWarmedUpAudioContext(): boolean {
    return hasWarmAudioContext;
}
