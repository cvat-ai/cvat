export function formatTimeShort(seconds: number): string {
    const safe = Math.max(0, seconds);
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    const deciseconds = Math.floor((safe % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${deciseconds}`;
}

export function formatTimeLong(seconds: number): string {
    const safe = Math.max(0, seconds);
    const hours = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = Math.floor(safe % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
