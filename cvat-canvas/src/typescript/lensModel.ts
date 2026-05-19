// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
//
// Fisheye lens model used to visually curve cuboid edges so they match the
// distortion that a 360 fisheye camera produces. Mirrors the Hugin-polynomial
// + equidistant-projection model used in Miovision's `miocv` and `pycv`
// codebases (see `lens_parameters.h` and `camera.py`).
//
// The model is a true equidistant fisheye:
//   r_px(theta) = f_px * theta,     f_px = (min(W,H)/2) / (HFOV/2)
// followed by the Hugin radial polynomial in normalized units, where the
// normalization radius is the image circle (= min(W,H)/2):
//   R_distorted = R * (d + R*(c + R*(b + R*a))),     d = 1 - (a + b + c)

import { Point } from './shared';

export type LensType = 'Equidistant';

export interface FisheyeParams {
    // Hugin polynomial radial coefficients. d = 1 - (a+b+c).
    a: number;
    b: number;
    c: number;
    // Horizontal field of view in radians (e.g. 3.1799898972 for a 360 cam).
    HFOVInRadians: number;
    // Image aspect ratio (width / height). 1.0 for a square sensor.
    aspectRatio: number;
    // Horizontal resolution in pixels. Image height = round(width / aspectRatio).
    horizontalResolution: number;
    // Lens model. Currently only Equidistant is supported.
    lensType: LensType;
    // Principal point in pixels. Defaults to image centre when omitted.
    cx?: number;
    cy?: number;
}

// Cam360 lens defaults from `components/libmiocv_core/include/miocv/camera_modelling/lens_parameters.h`.
export const CAM360_DEFAULTS = Object.freeze({
    a: 0.110,
    b: -0.283,
    c: 0.448,
    HFOVInRadians: 3.1799898972,
    aspectRatio: 1.0,
    horizontalResolution: 2992,
    lensType: 'Equidistant' as LensType,
});

interface DerivedIntrinsics {
    width: number;
    height: number;
    cx: number;
    cy: number;
    rNorm: number; // image-circle radius in pixels (min(W,H)/2)
    fPx: number; // equidistant focal length in pixels
}

function deriveIntrinsics(p: FisheyeParams): DerivedIntrinsics {
    const width = p.horizontalResolution;
    const height = Math.round(width / p.aspectRatio);
    const cx = p.cx ?? width / 2;
    const cy = p.cy ?? height / 2;
    const rNorm = Math.min(width, height) / 2;
    // Equidistant: r_px = f_px * theta, with HFOV mapping image circle.
    const fPx = rNorm / (p.HFOVInRadians / 2);
    return { width, height, cx, cy, rNorm, fPx };
}

// Hugin polynomial: R' = R * (d + R*(c + R*(b + R*a))), d = 1 - (a+b+c).
// Operates in image-circle-normalized units (1.0 == image circle radius).
function huginCorrect(rN: number, a: number, b: number, c: number): number {
    const d = 1 - (a + b + c);
    return rN * (d + rN * (c + rN * (b + rN * a)));
}

/**
 * Inverse of huginCorrect via Newton iteration with a bisection fallback so
 * that we still converge near roots where the derivative vanishes. Search is
 * clamped to rN in [-1.5, 1.5], which comfortably covers the image circle.
 */
function huginInverse(target: number, a: number, b: number, c: number): number {
    if (Math.abs(target) < 1e-12) return target;
    const sign = target < 0 ? -1 : 1;
    const t = Math.abs(target);
    const d = 1 - (a + b + c);

    const f = (r: number): number => r * (d + r * (c + r * (b + r * a))) - t;
    const fPrime = (r: number): number => d + r * (2 * c + r * (3 * b + r * 4 * a));

    // Newton iteration
    let r = t; // initial guess: f(0)=0 and slope d near 0, so target is a fine first guess
    let converged = false;
    for (let i = 0; i < 16; i++) {
        const fr = f(r);
        const fpr = fPrime(r);
        if (Math.abs(fpr) < 1e-6) break;
        const next = r - fr / fpr;
        if (!Number.isFinite(next) || next < -1.5 || next > 1.5) break;
        if (Math.abs(next - r) < 1e-10) {
            r = next;
            converged = true;
            break;
        }
        r = next;
    }

    if (!converged || !Number.isFinite(r) || Math.abs(f(r)) > 1e-7) {
        // Bisection fallback over [0, 1.5]; the polynomial is monotonically
        // increasing on this interval for the Cam360 coefficient ranges we use.
        let lo = 0;
        let hi = 1.5;
        let fLo = f(lo);
        let fHi = f(hi);
        if (fLo > 0) return sign * 0; // target undershoots
        if (fHi < 0) return sign * hi; // target exceeds search range
        for (let i = 0; i < 80; i++) {
            const mid = 0.5 * (lo + hi);
            const fMid = f(mid);
            if (Math.abs(fMid) < 1e-9 || (hi - lo) < 1e-10) {
                r = mid;
                break;
            }
            if ((fMid < 0) === (fLo < 0)) {
                lo = mid;
                fLo = fMid;
            } else {
                hi = mid;
                fHi = fMid;
            }
            r = 0.5 * (lo + hi);
        }
    }

    return sign * r;
}

export class FisheyeLens {
    public readonly params: FisheyeParams;
    private readonly intr: DerivedIntrinsics;

    public constructor(params: FisheyeParams) {
        this.params = { ...params };
        this.intr = deriveIntrinsics(this.params);
    }

    /**
     * Project a fisheye-image pixel back to a unit-length 3D ray in the camera
     * frame (+Z forward, +X right, +Y down). Uses the inverse Hugin polynomial
     * followed by the inverse equidistant projection theta = r_px / f_px.
     */
    public pixelToRay(px: Point): { x: number; y: number; z: number } {
        const {
            cx, cy, rNorm, fPx,
        } = this.intr;
        const { a, b, c } = this.params;
        const dx = px.x - cx;
        const dy = px.y - cy;
        const rDistPx = Math.hypot(dx, dy);
        if (rDistPx < 1e-9) return { x: 0, y: 0, z: 1 };

        const rDistN = rDistPx / rNorm;
        const rN = huginInverse(rDistN, a, b, c);
        let theta = (rN * rNorm) / fPx;
        // Clamp to in front of the camera; behind-camera rays cannot be drawn.
        const THETA_MAX = Math.PI - 1e-3;
        if (!Number.isFinite(theta)) theta = THETA_MAX;
        if (theta > THETA_MAX) theta = THETA_MAX;
        if (theta < 0) theta = 0;

        const phi = Math.atan2(dy, dx);
        const sinT = Math.sin(theta);
        return {
            x: sinT * Math.cos(phi),
            y: sinT * Math.sin(phi),
            z: Math.cos(theta),
        };
    }

    /**
     * Project a unit-length 3D ray onto a fisheye-image pixel. Uses the
     * equidistant projection r_px = f_px * theta, then the forward Hugin
     * polynomial in image-circle-normalized units.
     */
    public rayToPixel(r: { x: number; y: number; z: number }): Point {
        const {
            cx, cy, rNorm, fPx,
        } = this.intr;
        const { a, b, c } = this.params;

        const z = Math.max(-1, Math.min(1, r.z));
        const theta = Math.acos(z);
        const phi = Math.atan2(r.y, r.x);
        const rN = (fPx * theta) / rNorm;
        const rDistN = huginCorrect(rN, a, b, c);
        const rPx = rDistN * rNorm;

        return {
            x: cx + rPx * Math.cos(phi),
            y: cy + rPx * Math.sin(phi),
        };
    }

    /**
     * Backwards-compatible "undistort" that converts a fisheye pixel to a
     * pinhole-rectified pixel using the same focal length as the fisheye. Kept
     * for callers that still want a 2D rectified-space coordinate; new code
     * should prefer `pixelToRay`.
     */
    public undistortPoint(dist: Point): Point {
        const ray = this.pixelToRay(dist);
        const { cx, cy, fPx } = this.intr;
        if (ray.z <= 1e-6) {
            // Behind/at horizon: return a far-out point in the same direction.
            const rPlanar = Math.hypot(ray.x, ray.y) || 1e-9;
            const huge = 1e6;
            return { x: cx + (ray.x / rPlanar) * huge, y: cy + (ray.y / rPlanar) * huge };
        }
        return { x: cx + (ray.x / ray.z) * fPx, y: cy + (ray.y / ray.z) * fPx };
    }

    /**
     * Backwards-compatible "distort" that takes a pinhole-rectified pixel and
     * returns the corresponding fisheye pixel. New code should prefer building
     * a 3D ray and using `rayToPixel`.
     */
    public distortPoint(undist: Point): Point {
        const { cx, cy, fPx } = this.intr;
        const x = (undist.x - cx) / fPx;
        const y = (undist.y - cy) / fPx;
        const norm = Math.hypot(x, y, 1);
        return this.rayToPixel({ x: x / norm, y: y / norm, z: 1 / norm });
    }
}

function midRay(r1: { x: number; y: number; z: number },
    r2: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const x = r1.x + r2.x;
    const y = r1.y + r2.y;
    const z = r1.z + r2.z;
    const n = Math.hypot(x, y, z) || 1;
    return { x: x / n, y: y / n, z: z / n };
}

/**
 * Adaptive subdivision: walk along the actual 3D line connecting the two
 * camera-space rays (slerp on the unit sphere), and refine until the chord
 * between two samples is within `tolPx` of the curved midpoint.
 */
function subdivide(
    p1: Point, r1: { x: number; y: number; z: number },
    p2: Point, r2: { x: number; y: number; z: number },
    lens: FisheyeLens, depth: number, maxDepth: number, tolPx: number,
): Point[] {
    const rMid = midRay(r1, r2);
    const pMid = lens.rayToPixel(rMid);
    const linMidX = (p1.x + p2.x) / 2;
    const linMidY = (p1.y + p2.y) / 2;
    const err = Math.hypot(pMid.x - linMidX, pMid.y - linMidY);
    if (depth >= maxDepth || err < tolPx) return [p1, pMid, p2];
    const left = subdivide(p1, r1, pMid, rMid, lens, depth + 1, maxDepth, tolPx);
    const right = subdivide(pMid, rMid, p2, r2, lens, depth + 1, maxDepth, tolPx);
    return [...left, ...right.slice(1)];
}

/**
 * Sample a cuboid edge between two fisheye-image pixel points into curved
 * sample points that follow the actual lens projection of a straight 3D line.
 *
 * Both endpoints are unprojected to 3D rays, then we walk a great-circle
 * (slerp) between them — this is the image of the underlying 3D edge under
 * the fisheye, not just a "bent pixel-space chord". Subdivision is adaptive:
 * shallow recursion in image regions where the line is nearly straight, deep
 * recursion near the periphery where curvature is highest.
 *
 * If `lens` is null, the original two endpoints are returned unchanged so the
 * cuboid keeps its current straight-edge appearance.
 */
export function curvedEdgePoints(
    p1: Point, p2: Point, lens: FisheyeLens | null,
    opts: { maxDepth?: number; tolPx?: number } = {},
): Point[] {
    if (!lens) return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];

    const r1 = lens.pixelToRay(p1);
    const r2 = lens.pixelToRay(p2);

    // Endpoints we render are the lens projection of the rays, so the curve
    // is exactly anchored at p1/p2 even if the rays land slightly off due to
    // finite-precision Hugin inversion.
    const a1 = lens.rayToPixel(r1);
    const a2 = lens.rayToPixel(r2);

    return subdivide(
        a1, r1, a2, r2, lens,
        0, opts.maxDepth ?? 6, opts.tolPx ?? 0.5,
    );
}

/** Build an SVG `path` "d" attribute string from a list of points. */
export function pointsToPathD(points: Point[], close = false): string {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
    }
    if (close) d += ' Z';
    return d;
}

/**
 * Build a closed face path by stitching together curved samples along each of
 * the face's four edges in order.
 */
export function faceToCurvedPathD(
    corners: Point[], lens: FisheyeLens | null,
    opts: { maxDepth?: number; tolPx?: number } = {},
): string {
    if (corners.length === 0) return '';
    const all: Point[] = [];
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        const seg = curvedEdgePoints(a, b, lens, opts);
        // Drop the first point of every subsequent segment to avoid duplicates.
        const start = i === 0 ? 0 : 1;
        for (let j = start; j < seg.length; j++) all.push(seg[j]);
    }
    return `${pointsToPathD(all)} Z`;
}

