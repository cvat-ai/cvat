export function formatTimeShort(seconds: number): string {
    const safe = Math.max(0, seconds);
    const totalMins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    const deciseconds = Math.floor((safe % 1) * 10);
    return `${totalMins}:${secs.toString().padStart(2, '0')}.${deciseconds}`;
}
