// Min/max zoom (px per second) for audio waveform.
//
// Wavesurfer renders the entire waveform onto canvases; total pixel width =
// duration * zoom. Very high totals cripple performance (many canvases, slow
// scroll). Cap zoom so:
//   - total waveform width never exceeds MAX_TOTAL_PX
//   - and zoom never exceeds MAX_PX_PER_SEC (further zoom shows < ~2 ms/px,
//     beyond useful resolution for any sample rate)
//
// Result: short audio gets the full MAX_PX_PER_SEC; long audio is capped by
// MAX_TOTAL_PX / duration so the canvas budget stays bounded.

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
