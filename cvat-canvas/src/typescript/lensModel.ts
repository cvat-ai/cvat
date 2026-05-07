// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
//
// Fisheye lens model used to visually curve cuboid edges so they match the
// distortion that a 360 fisheye camera produces. Mirrors the Hugin-polynomial
// + equidistant-projection model used in Miovision's `miocv` and `pycv`
// codebases (see `lens_parameters.h` and `camera.py`).

import { Point } from './shared';

export interface FisheyeParams {
    // OpenCV-style intrinsics, in pixels.
    fx: number;
    fy: number;
    cx: number;
    cy: number;
    // Hugin polynomial radial coefficients. d = 1 - (a+b+c).
    a: number;
    b: number;
    c: number;
    // Equidistant focal in normalized units (= 1 / half_HFOV_rad).
    F: number;
    // Image dimensions, used for sanity-checks/serialization.
    imageWidth: number;
    imageHeight: number;
}

// Cam360 lens defaults from `components/libmiocv_core/include/miocv/camera_modelling/lens_parameters.h`.
export const CAM360_DEFAULTS = Object.freeze({
    a: 0.110,
    b: -0.283,
    c: 0.448,
    F: 0.6289,
});

// Convenience constructor that fills in Hugin defaults for a Cam360 sensor.
export function buildCam360Params(intrinsics: {
    fx: number; fy: number; cx: number; cy: number;
    imageWidth: number; imageHeight: number;
}): FisheyeParams {
    return {
        ...intrinsics,
        a: CAM360_DEFAULTS.a,
        b: CAM360_DEFAULTS.b,
        c: CAM360_DEFAULTS.c,
        F: CAM360_DEFAULTS.F,
    };
}

// Hugin polynomial: r' = r * (d + r*(c + r*(b + r*a))), d = 1 - (a+b+c).
function huginCorrect(r: number, a: number, b: number, c: number): number {
    const d = 1 - (a + b + c);
    return r * (d + r * (c + r * (b + r * a)));
}

// Inverse of huginCorrect via Newton iteration. Solves correct(r) = target.
function huginInverse(target: number, a: number, b: number, c: number): number {
    if (Math.abs(target) < 1e-12) return target;
    const d = 1 - (a + b + c);
    let r = target; // initial guess
    for (let i = 0; i < 12; i++) {
        const f = r * (d + r * (c + r * (b + r * a))) - target;
        // derivative: d + 2cr + 3br^2 + 4ar^3
        const fPrime = d + r * (2 * c + r * (3 * b + r * 4 * a));
        if (Math.abs(fPrime) < 1e-12) break;
        const next = r - f / fPrime;
        if (Math.abs(next - r) < 1e-10) {
            r = next;
            break;
        }
        r = next;
    }
    return r;
}

export class FisheyeLens {
    public readonly params: FisheyeParams;

    public constructor(params: FisheyeParams) {
        this.params = { ...params };
    }

    /**
     * Take a "rectified" (undistorted) image-pixel point and return where the
     * fisheye lens would have placed it on the actual fisheye image.
     *
     * Equidistant projection: theta = atan(r), then Hugin polynomial scales it.
     */
    public distortPoint(undist: Point): Point {
        const {
            fx, fy, cx, cy, a, b, c, F,
        } = this.params;
        const x = (undist.x - cx) / fx;
        const y = (undist.y - cy) / fy;
        const r = Math.hypot(x, y);
        if (r < 1e-9) return { x: undist.x, y: undist.y };

        const theta = Math.atan(r);
        const rDist = huginCorrect(F * theta, a, b, c);
        const scale = rDist / r;
        return {
            x: cx + fx * x * scale,
            y: cy + fy * y * scale,
        };
    }

    /**
     * Inverse of distortPoint: take a fisheye image-pixel point and return the
     * corresponding rectified-pixel coordinate.
     *
     * If the point falls outside the lens projection's image circle, we clamp
     * theta to just under pi/2 so the returned coordinate is finite; callers
     * (e.g. cuboid edge sampling) get a well-behaved limit value rather than
     * NaN/Infinity.
     */
    public undistortPoint(dist: Point): Point {
        const {
            fx, fy, cx, cy, a, b, c, F,
        } = this.params;
        const xd = (dist.x - cx) / fx;
        const yd = (dist.y - cy) / fy;
        const rd = Math.hypot(xd, yd);
        if (rd < 1e-9) return { x: dist.x, y: dist.y };

        const fTheta = huginInverse(rd, a, b, c);
        let theta = fTheta / F;
        const THETA_MAX = Math.PI / 2 - 1e-3;
        if (!Number.isFinite(theta) || theta > THETA_MAX) theta = THETA_MAX;
        if (theta < -THETA_MAX) theta = -THETA_MAX;
        // Inverse equidistant: r = tan(theta)
        const r = Math.tan(theta);
        const scale = r / rd;
        return {
            x: cx + fx * xd * scale,
            y: cy + fy * yd * scale,
        };
    }
}

/**
 * Sample a straight edge between two fisheye-image pixel points into N curved
 * sample points that follow the lens distortion. Implementation undistorts the
 * endpoints, walks a straight line in rectified space, and re-distorts.
 *
 * If `lens` is null the original two endpoints are returned unchanged so the
 * cuboid keeps its current straight-edge appearance.
 */
export function curvedEdgePoints(
    p1: Point, p2: Point, lens: FisheyeLens | null, samples = 16,
): Point[] {
    if (!lens) return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];

    const u1 = lens.undistortPoint(p1);
    const u2 = lens.undistortPoint(p2);

    const out: Point[] = [];
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = u1.x + (u2.x - u1.x) * t;
        const y = u1.y + (u2.y - u1.y) * t;
        out.push(lens.distortPoint({ x, y }));
    }
    return out;
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
    corners: Point[], lens: FisheyeLens | null, samplesPerEdge = 16,
): string {
    if (corners.length === 0) return '';
    const all: Point[] = [];
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        const seg = curvedEdgePoints(a, b, lens, samplesPerEdge);
        // Drop the first point of every subsequent segment to avoid duplicates.
        const start = i === 0 ? 0 : 1;
        for (let j = start; j < seg.length; j++) all.push(seg[j]);
    }
    return `${pointsToPathD(all)} Z`;
}
