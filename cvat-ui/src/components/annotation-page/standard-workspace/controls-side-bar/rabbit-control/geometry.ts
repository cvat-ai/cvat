// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// ─── Constants ───────────────────────────────────────────────────────────────

/** Half-width of the perpendicular buffer around a 2-point line (px, image space). */
export const LINE_BUFFER_PX = 10;

/** Radius of the circular mask created from a single point (px, image space). */
export const CIRCLE_BUFFER_PX = 10;

/** Number of polygon segments used to approximate a circle. */
const CIRCLE_SEGMENTS = 32;

// ─── Internal RLE helper ──────────────────────────────────────────────────────

/**
 * Converts an RGBA Uint8ClampedArray to CVAT-style Run-Length Encoding.
 *
 * The RLE is a flat array of alternating run-counts, starting with the count
 * of *background* (alpha = 0) pixels.  If the very first pixel is foreground
 * the first value is 0.
 *
 * This is a faithful re-implementation of the private helper found in
 * cvat-canvas/src/typescript/shared.ts (imageDataToRLE).
 */
function imageDataToRLE(imageData: Uint8ClampedArray): number[] {
    const rle: number[] = [];
    let prev = 0; // 0 = background, starts with background
    let summ = 0;

    for (let i = 3; i < imageData.length; i += 4) {
        const alpha = imageData[i] > 0 ? 1 : 0;
        if (prev !== alpha) {
            rle.push(summ);
            prev = alpha;
            summ = 1;
        } else {
            summ++;
        }
    }
    rle.push(summ);
    return rle;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Rasterises `vertices` onto an off-screen canvas and returns CVAT mask points:
 *   `[...rle, left, top, right, bottom]`
 *
 * Coordinates are in **image space** (same coordinate system used by
 * `canvas.interacted` events).
 */
export function polygonToMaskPoints(vertices: [number, number][]): number[] {
    if (vertices.length < 3) return [];

    const xs = vertices.map(([x]) => x);
    const ys = vertices.map(([, y]) => y);
    const left = Math.floor(Math.min(...xs));
    const right = Math.ceil(Math.max(...xs));
    const top = Math.floor(Math.min(...ys));
    const bottom = Math.ceil(Math.max(...ys));

    const width = right - left + 1;
    const height = bottom - top + 1;
    if (width <= 0 || height <= 0) return [];

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return [];

    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.moveTo(vertices[0][0] - left, vertices[0][1] - top);
    for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i][0] - left, vertices[i][1] - top);
    }
    ctx.closePath();
    ctx.fill();

    const { data } = ctx.getImageData(0, 0, width, height);
    const rle = imageDataToRLE(data);
    rle.push(left, top, right, bottom);
    return rle;
}

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
