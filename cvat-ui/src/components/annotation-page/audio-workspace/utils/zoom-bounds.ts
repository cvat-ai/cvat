export const ZOOM_MIN = 1;
const MAX_PX_PER_SEC = 500;
const MAX_TOTAL_PX = 60000;
const HARD_CEILING = 1000;

export function computeMaxZoom(duration: number): number {
    if (!duration || duration <= 0) return HARD_CEILING;
    const byTotal = Math.floor(MAX_TOTAL_PX / duration);
    const cap = Math.min(MAX_PX_PER_SEC, byTotal);
    return Math.max(ZOOM_MIN + 1, Math.min(HARD_CEILING, cap));
}
