// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// ─── Constants ───────────────────────────────────────────────────────────────

/** Half-width of the perpendicular buffer around a 2-point line (px, image space). */
export const LINE_BUFFER_PX = 50;

/** Radius of the circular mask created from a single point (px, image space). */
export const CIRCLE_BUFFER_PX = 50;

/** Number of polygon segments used to approximate a circle. */
const CIRCLE_SEGMENTS = 32;

// ─── Core RLE builder ────────────────────────────────────────────────────────

/**
 * Converts a polygon (given as a list of [x, y] vertices) directly to a
 * CVAT mask-points array  `[...rle, left, top, right, bottom]`  using a
 * pure-JS scanline fill.
 *
 * **Why this is faster than the canvas approach:**
 * The previous implementation drew the polygon onto an OffscreenCanvas and
 * then called `ctx.getImageData()`.  That call forces a GPU→CPU readback that
 * costs O(bbox_width × bbox_height × 4 bytes) — for a 2000×1000 annotation
 * that is ~8 MB of pixel data copied synchronously on the main thread.
 *
 * This implementation has no GPU round-trip: for each scan line it solves the
 * N edge equations once (O(N) per row, where N is the vertex count) and emits
 * the RLE run lengths directly.  Memory usage is O(N + H) instead of
 * O(W × H × 4).
 *
 * Coordinates are in **image space** (same system used by `canvas.interacted`
 * events).
 */
export function polygonToMaskPoints(vertices: [number, number][]): number[] {
    if (vertices.length < 3) return [];

    // ── 1. Integer bounding box ───────────────────────────────────────────────
    let minX = Infinity; let maxX = -Infinity;
    let minY = Infinity; let maxY = -Infinity;
    for (const [x, y] of vertices) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    const left = Math.floor(minX);
    const right = Math.ceil(maxX);
    const top = Math.floor(minY);
    const bottom = Math.ceil(maxY);
    const width = right - left + 1;
    const height = bottom - top + 1;
    if (width <= 0 || height <= 0) return [];

    // ── 2. Collect x-intersections per scan line ──────────────────────────────
    //
    // Convention (avoids double-counting shared vertices):
    //   Edge from loY → hiY contributes to integer rows  [ceil(loY), ceil(hiY) − 1].
    //
    // This is the standard "top-rule" that prevents a vertex being counted twice
    // when two edges share a point.
    const n = vertices.length;
    const rowXs: number[][] = Array.from({ length: height }, () => []);

    for (let i = 0; i < n; i++) {
        const [ax, ay] = vertices[i];
        const [bx, by] = vertices[(i + 1) % n];
        if (ay === by) continue; // horizontal edge — skip

        const [loX, loY, hiX, hiY] = ay < by
            ? [ax, ay, bx, by]
            : [bx, by, ax, ay];

        const yStart = Math.ceil(loY);
        const yEnd = Math.ceil(hiY) - 1;
        if (yStart > yEnd) continue;

        const dxdy = (hiX - loX) / (hiY - loY);

        for (let y = yStart; y <= yEnd; y++) {
            const row = y - top;
            if (row >= 0 && row < height) {
                rowXs[row].push(loX + (y - loY) * dxdy);
            }
        }
    }

    // ── 3. Build RLE directly from sorted per-row intersections ───────────────
    //
    // CVAT RLE format: flat alternating [bg, fg, bg, fg, …] run-lengths,
    // starting with a background count (0 if the first pixel is foreground).
    //
    // The pixel at column x (in image space) is considered INSIDE the polygon
    // when x lies in [ceil(xLeft), floor(xRight)] for an intersection pair.
    const rle: number[] = [];
    let isFg = false; // current run type; starts with background
    let run = 0;      // current run length

    for (let row = 0; row < height; row++) {
        const xs = rowXs[row];
        xs.sort((a, b) => a - b);

        let col = left; // image-space x of the next un-emitted pixel

        for (let k = 0; k + 1 < xs.length; k += 2) {
            // Pixel range for this foreground span: [xIn, xOut] inclusive
            const xIn = Math.max(left, Math.ceil(xs[k]));
            const xOut = Math.min(right, Math.floor(xs[k + 1]));
            if (xOut < xIn) continue;

            // Background segment before this span
            const bgLen = xIn - col;
            if (bgLen > 0) {
                if (isFg) { rle.push(run); isFg = false; run = bgLen; }
                else { run += bgLen; }
            }

            // Foreground span
            const fgLen = xOut - xIn + 1;
            if (!isFg) { rle.push(run); isFg = true; run = fgLen; }
            else { run += fgLen; }

            col = xOut + 1;
        }

        // Background tail of this row (merges seamlessly into the next row's
        // leading background, keeping the RLE flat across rows)
        const tailLen = right - col + 1;
        if (tailLen > 0) {
            if (isFg) { rle.push(run); isFg = false; run = tailLen; }
            else { run += tailLen; }
        }
    }

    rle.push(run); // flush the final run
    rle.push(left, top, right, bottom);
    return rle;
}

// ─── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Returns the four corner vertices of a rectangle (buffer) centred on the
 * segment p1→p2 with perpendicular half-width `buffer`.
 *
 * Falls back to a circle when p1 === p2.
 */
export function lineBufferVertices(
    p1: [number, number],
    p2: [number, number],
    buffer: number,
): [number, number][] {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 1e-6) {
        return circleVertices(p1, buffer);
    }

    // Perpendicular unit vector scaled by buffer
    const nx = (-dy / len) * buffer;
    const ny = (dx / len) * buffer;

    return [
        [p1[0] + nx, p1[1] + ny],
        [p2[0] + nx, p2[1] + ny],
        [p2[0] - nx, p2[1] - ny],
        [p1[0] - nx, p1[1] - ny],
    ];
}

/**
 * Returns `segments` vertices approximating a circle around `center` with
 * the given `radius`.
 */
export function circleVertices(
    center: [number, number],
    radius: number,
    segments: number = CIRCLE_SEGMENTS,
): [number, number][] {
    return Array.from({ length: segments }, (_, i): [number, number] => {
        const angle = (i / segments) * 2 * Math.PI;
        return [
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius,
        ];
    });
}
