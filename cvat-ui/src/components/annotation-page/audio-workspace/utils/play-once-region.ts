// Tracks region whose playback was started by a double-click and should pause
// at region.end (instead of continuing through the rest of the audio).
// Cleared when the region's playback ends, when the active region changes,
// or when a non-double-click playback is triggered.

let playOnceRegionId: string | null = null;

export function setPlayOnceRegionId(id: string | null): void {
    playOnceRegionId = id;
}

export function getPlayOnceRegionId(): string | null {
    return playOnceRegionId;
}
