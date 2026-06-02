let playOnceRegionId: string | null = null;

export function setPlayOnceRegionId(id: string | null): void {
    playOnceRegionId = id;
}

export function getPlayOnceRegionId(): string | null {
    return playOnceRegionId;
}
