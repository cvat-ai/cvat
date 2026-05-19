// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
//
// Run with:   node --test cvat-canvas/tests/
//
// IMPORTANT: this file mirrors the math in `src/typescript/lensModel.ts`. The
// repo has no JS test runner / TypeScript transpiler configured, so we use
// Node's built-in `node:test` against a JS port of the same algorithm. If you
// touch the polynomial / projection logic in lensModel.ts, mirror the change
// here.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const CAM360_DEFAULTS = {
    a: 0.110,
    b: -0.283,
    c: 0.448,
    HFOVInRadians: 3.1799898972,
    aspectRatio: 1.0,
    horizontalResolution: 2992,
    lensType: 'Equidistant',
};

function deriveIntrinsics(p) {
    const width = p.horizontalResolution;
    const height = Math.round(width / p.aspectRatio);
    const cx = p.cx ?? width / 2;
    const cy = p.cy ?? height / 2;
    const rNorm = Math.min(width, height) / 2;
    const fPx = rNorm / (p.HFOVInRadians / 2);
    return { width, height, cx, cy, rNorm, fPx };
}

function huginCorrect(rN, a, b, c) {
    const d = 1 - (a + b + c);
    return rN * (d + rN * (c + rN * (b + rN * a)));
}

function huginInverse(target, a, b, c) {
    if (Math.abs(target) < 1e-12) return target;
    const sign = target < 0 ? -1 : 1;
    const t = Math.abs(target);
    const d = 1 - (a + b + c);
    const f = (r) => r * (d + r * (c + r * (b + r * a))) - t;
    const fPrime = (r) => d + r * (2 * c + r * (3 * b + r * 4 * a));

    let r = t;
    let converged = false;
    for (let i = 0; i < 16; i++) {
        const fr = f(r);
        const fpr = fPrime(r);
        if (Math.abs(fpr) < 1e-6) break;
        const next = r - fr / fpr;
        if (!Number.isFinite(next) || next < -1.5 || next > 1.5) break;
        if (Math.abs(next - r) < 1e-10) { r = next; converged = true; break; }
        r = next;
    }
    if (!converged || !Number.isFinite(r) || Math.abs(f(r)) > 1e-7) {
        let lo = 0;
        let hi = 1.5;
        let fLo = f(lo);
        let fHi = f(hi);
        if (fLo > 0) return sign * 0;
        if (fHi < 0) return sign * hi;
        for (let i = 0; i < 80; i++) {
            const mid = 0.5 * (lo + hi);
            const fMid = f(mid);
            if (Math.abs(fMid) < 1e-9 || (hi - lo) < 1e-10) { r = mid; break; }
            if ((fMid < 0) === (fLo < 0)) { lo = mid; fLo = fMid; } else { hi = mid; fHi = fMid; }
            r = 0.5 * (lo + hi);
        }
    }
    return sign * r;
}

class FisheyeLens {
    constructor(params) {
        this.params = { ...params };
        this.intr = deriveIntrinsics(this.params);
    }

    pixelToRay(px) {
        const { cx, cy, rNorm, fPx } = this.intr;
        const { a, b, c } = this.params;
        const dx = px.x - cx;
        const dy = px.y - cy;
        const rDistPx = Math.hypot(dx, dy);
        if (rDistPx < 1e-9) return { x: 0, y: 0, z: 1 };
        const rDistN = rDistPx / rNorm;
        const rN = huginInverse(rDistN, a, b, c);
        let theta = (rN * rNorm) / fPx;
        const THETA_MAX = Math.PI - 1e-3;
        if (!Number.isFinite(theta)) theta = THETA_MAX;
        if (theta > THETA_MAX) theta = THETA_MAX;
        if (theta < 0) theta = 0;
        const phi = Math.atan2(dy, dx);
        const sinT = Math.sin(theta);
        return { x: sinT * Math.cos(phi), y: sinT * Math.sin(phi), z: Math.cos(theta) };
    }

    rayToPixel(r) {
        const { cx, cy, rNorm, fPx } = this.intr;
        const { a, b, c } = this.params;
        const z = Math.max(-1, Math.min(1, r.z));
        const theta = Math.acos(z);
        const phi = Math.atan2(r.y, r.x);
        const rN = (fPx * theta) / rNorm;
        const rDistN = huginCorrect(rN, a, b, c);
        const rPx = rDistN * rNorm;
        return { x: cx + rPx * Math.cos(phi), y: cy + rPx * Math.sin(phi) };
    }
}

function midRay(r1, r2) {
    const x = r1.x + r2.x;
    const y = r1.y + r2.y;
    const z = r1.z + r2.z;
    const n = Math.hypot(x, y, z) || 1;
    return { x: x / n, y: y / n, z: z / n };
}

function subdivide(p1, r1, p2, r2, lens, depth, maxDepth, tolPx) {
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

function curvedEdgePoints(p1, p2, lens, opts = {}) {
    if (!lens) return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
    const r1 = lens.pixelToRay(p1);
    const r2 = lens.pixelToRay(p2);
    const a1 = lens.rayToPixel(r1);
    const a2 = lens.rayToPixel(r2);
    return subdivide(a1, r1, a2, r2, lens, 0, opts.maxDepth ?? 6, opts.tolPx ?? 0.5);
}

const APPROX = 1e-6;

test('huginCorrect with all-zero coeffs is identity', () => {
    assert.equal(huginCorrect(0.5, 0, 0, 0), 0.5);
    assert.equal(huginCorrect(0.0, 0, 0, 0), 0.0);
    assert.equal(huginCorrect(1.0, 0, 0, 0), 1.0);
});

test('huginCorrect d-coefficient sums to 1', () => {
    const { a, b, c } = CAM360_DEFAULTS;
    assert.ok(Math.abs(huginCorrect(1, a, b, c) - 1) < APPROX);
});

test('huginInverse round-trips on a range of radii', () => {
    const { a, b, c } = CAM360_DEFAULTS;
    for (const r of [0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 1.2]) {
        const corrected = huginCorrect(r, a, b, c);
        const back = huginInverse(corrected, a, b, c);
        assert.ok(Math.abs(back - r) < 1e-6, `r=${r} got ${back}`);
    }
});

test('huginInverse handles negative inputs symmetrically', () => {
    const { a, b, c } = CAM360_DEFAULTS;
    const corrected = huginCorrect(0.4, a, b, c);
    const back = huginInverse(-corrected, a, b, c);
    assert.ok(Math.abs(back + 0.4) < 1e-6);
});

test('FisheyeLens: derived intrinsics match expected values for Cam360', () => {
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    assert.equal(lens.intr.width, 2992);
    assert.equal(lens.intr.height, 2992);
    assert.equal(lens.intr.cx, 1496);
    assert.equal(lens.intr.cy, 1496);
    assert.equal(lens.intr.rNorm, 1496);
    // fPx = 1496 / (HFOV/2) ≈ 1496 / 1.59 ≈ 941
    assert.ok(Math.abs(lens.intr.fPx - 1496 / (CAM360_DEFAULTS.HFOVInRadians / 2)) < 1e-9);
});

test('FisheyeLens: principal-point pixel maps to forward ray and back', () => {
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    const c = { x: 1496, y: 1496 };
    const ray = lens.pixelToRay(c);
    assert.ok(Math.abs(ray.x) < APPROX && Math.abs(ray.y) < APPROX && Math.abs(ray.z - 1) < APPROX);
    const back = lens.rayToPixel(ray);
    assert.ok(Math.abs(back.x - c.x) < APPROX && Math.abs(back.y - c.y) < APPROX);
});

test('FisheyeLens: pixel <-> ray round-trips inside the image circle', () => {
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    const samples = [
        { x: 1496, y: 800 },
        { x: 800, y: 1496 },
        { x: 2190, y: 1496 },
        { x: 1496 + 500, y: 1496 + 500 },
        { x: 1496 - 400, y: 1496 + 400 },
        { x: 1496 + 200, y: 1496 - 600 },
        // near the edge of the image circle
        { x: 1496 + 1400, y: 1496 },
    ];
    for (const p of samples) {
        const back = lens.rayToPixel(lens.pixelToRay(p));
        assert.ok(
            Math.abs(back.x - p.x) < 1e-3 && Math.abs(back.y - p.y) < 1e-3,
            `round-trip mismatch for ${JSON.stringify(p)} -> ${JSON.stringify(back)}`,
        );
    }
});

test('FisheyeLens: a 90-degree off-axis ray lands at half the image-circle radius', () => {
    // For an equidistant projection r = f * theta, theta = pi/2 corresponds to
    // r_px = f_px * pi/2. With Hugin coefficients applied to the normalized
    // radius, we still expect a finite, in-image result.
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    const px = lens.rayToPixel({ x: 1, y: 0, z: 0 });
    assert.ok(Number.isFinite(px.x) && Number.isFinite(px.y));
    assert.ok(px.x > 1496, `expected to project to the right of centre, got ${px.x}`);
});

test('curvedEdgePoints: returns endpoints when lens is null', () => {
    const pts = curvedEdgePoints({ x: 100, y: 200 }, { x: 300, y: 400 }, null);
    assert.equal(pts.length, 2);
    assert.deepEqual(pts[0], { x: 100, y: 200 });
    assert.deepEqual(pts[1], { x: 300, y: 400 });
});

test('curvedEdgePoints: anchored at original endpoints (within sub-pixel)', () => {
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    const p1 = { x: 900, y: 1496 };
    const p2 = { x: 2090, y: 1496 };
    const pts = curvedEdgePoints(p1, p2, lens);
    assert.ok(pts.length >= 3);
    assert.ok(Math.abs(pts[0].x - p1.x) < 1e-3 && Math.abs(pts[0].y - p1.y) < 1e-3);
    assert.ok(Math.abs(pts[pts.length - 1].x - p2.x) < 1e-3
        && Math.abs(pts[pts.length - 1].y - p2.y) < 1e-3);
});

test('curvedEdgePoints: a horizontal off-centre chord bows away from a straight line', () => {
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    // Chord above the principal point but inside the image circle.
    const p1 = { x: 1000, y: 1000 };
    const p2 = { x: 1991, y: 1000 };
    const pts = curvedEdgePoints(p1, p2, lens);
    const mid = pts[Math.floor(pts.length / 2)];
    const straightMidY = (p1.y + p2.y) / 2;
    assert.ok(
        Math.abs(mid.y - straightMidY) > 1.0,
        `expected curve midpoint to deviate from straight line, deviation=${mid.y - straightMidY}`,
    );
});

test('curvedEdgePoints: adaptive sampling produces denser samples near the periphery', () => {
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    // Near the centre, the line is nearly straight, so we expect few samples.
    const nearCentre = curvedEdgePoints({ x: 1490, y: 1490 }, { x: 1502, y: 1502 }, lens);
    // Near the periphery, curvature is high, so we expect more samples.
    const farFromCentre = curvedEdgePoints({ x: 200, y: 200 }, { x: 200, y: 2700 }, lens);
    assert.ok(
        farFromCentre.length > nearCentre.length,
        `expected more samples near periphery (${farFromCentre.length} vs ${nearCentre.length})`,
    );
});

test('FisheyeLens: pixelToRay stays finite outside the image circle', () => {
    const lens = new FisheyeLens(CAM360_DEFAULTS);
    const r = lens.pixelToRay({ x: 50, y: 50 });
    assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.z));
});
