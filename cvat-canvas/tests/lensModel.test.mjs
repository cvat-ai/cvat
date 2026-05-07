// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
//
// Run with:   node --test cvat-canvas/tests/
//
// IMPORTANT: this file mirrors the math in `src/typescript/lensModel.ts`. The
// repo has no JS test runner / TypeScript transpiler configured, so we use
// Node's built-in `node:test` against a JS port of the same algorithm. If you
// touch the polynomial logic in lensModel.ts, mirror the change here.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const CAM360_DEFAULTS = { a: 0.110, b: -0.283, c: 0.448, F: 0.6289 };

// Miovision 360 fisheye intrinsics from `vca/toolbox/.../calibration_config.py`.
const MIOVISION_FISHEYE_PARAMS = {
    fx: 737.514357,
    fy: 738.114239,
    cx: 1495.5,
    cy: 1495.5,
    imageWidth: 2992,
    imageHeight: 2992,
    ...CAM360_DEFAULTS,
};

function huginCorrect(r, a, b, c) {
    const d = 1 - (a + b + c);
    return r * (d + r * (c + r * (b + r * a)));
}

function huginInverse(target, a, b, c) {
    if (Math.abs(target) < 1e-12) return target;
    const d = 1 - (a + b + c);
    let r = target;
    for (let i = 0; i < 12; i++) {
        const f = r * (d + r * (c + r * (b + r * a))) - target;
        const fPrime = d + r * (2 * c + r * (3 * b + r * 4 * a));
        if (Math.abs(fPrime) < 1e-12) break;
        const next = r - f / fPrime;
        if (Math.abs(next - r) < 1e-10) { r = next; break; }
        r = next;
    }
    return r;
}

class FisheyeLens {
    constructor(params) { this.params = { ...params }; }

    distortPoint(p) {
        const { fx, fy, cx, cy, a, b, c, F } = this.params;
        const x = (p.x - cx) / fx;
        const y = (p.y - cy) / fy;
        const r = Math.hypot(x, y);
        if (r < 1e-9) return { x: p.x, y: p.y };
        const theta = Math.atan(r);
        const rDist = huginCorrect(F * theta, a, b, c);
        const scale = rDist / r;
        return { x: cx + fx * x * scale, y: cy + fy * y * scale };
    }

    undistortPoint(p) {
        const { fx, fy, cx, cy, a, b, c, F } = this.params;
        const xd = (p.x - cx) / fx;
        const yd = (p.y - cy) / fy;
        const rd = Math.hypot(xd, yd);
        if (rd < 1e-9) return { x: p.x, y: p.y };
        const fTheta = huginInverse(rd, a, b, c);
        let theta = fTheta / F;
        const THETA_MAX = Math.PI / 2 - 1e-3;
        if (!Number.isFinite(theta) || theta > THETA_MAX) theta = THETA_MAX;
        if (theta < -THETA_MAX) theta = -THETA_MAX;
        const r = Math.tan(theta);
        const scale = r / rd;
        return { x: cx + fx * xd * scale, y: cy + fy * yd * scale };
    }
}

function curvedEdgePoints(p1, p2, lens, samples = 16) {
    if (!lens) return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
    const u1 = lens.undistortPoint(p1);
    const u2 = lens.undistortPoint(p2);
    const out = [];
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = u1.x + (u2.x - u1.x) * t;
        const y = u1.y + (u2.y - u1.y) * t;
        out.push(lens.distortPoint({ x, y }));
    }
    return out;
}

const APPROX = 1e-6;

test('huginCorrect with all-zero coeffs is identity', () => {
    assert.equal(huginCorrect(0.5, 0, 0, 0), 0.5);
    assert.equal(huginCorrect(0.0, 0, 0, 0), 0.0);
    assert.equal(huginCorrect(1.0, 0, 0, 0), 1.0);
});

test('huginCorrect d-coefficient sums to 1', () => {
    const { a, b, c } = CAM360_DEFAULTS;
    // r = 1 should give a + b + c + d = 1
    assert.ok(Math.abs(huginCorrect(1, a, b, c) - 1) < APPROX);
});

test('huginInverse round-trips on a range of radii', () => {
    const { a, b, c } = CAM360_DEFAULTS;
    for (const r of [0.05, 0.1, 0.25, 0.5, 0.75, 1.0]) {
        const corrected = huginCorrect(r, a, b, c);
        const back = huginInverse(corrected, a, b, c);
        assert.ok(Math.abs(back - r) < 1e-7, `r=${r} got ${back}`);
    }
});

test('FisheyeLens: principal-point pixel maps to itself', () => {
    const lens = new FisheyeLens(MIOVISION_FISHEYE_PARAMS);
    const center = { x: MIOVISION_FISHEYE_PARAMS.cx, y: MIOVISION_FISHEYE_PARAMS.cy };
    const d = lens.distortPoint(center);
    const u = lens.undistortPoint(center);
    assert.ok(Math.abs(d.x - center.x) < APPROX && Math.abs(d.y - center.y) < APPROX);
    assert.ok(Math.abs(u.x - center.x) < APPROX && Math.abs(u.y - center.y) < APPROX);
});

test('FisheyeLens: distort/undistort round-trip across the visible image circle', () => {
    // Cam360 fisheye image circle in this intrinsic set has a radius of roughly
    // ~720 px from the principal point; sample only points inside that circle.
    const lens = new FisheyeLens(MIOVISION_FISHEYE_PARAMS);
    const samples = [
        { x: 1495.5, y: 800 },
        { x: 800, y: 1495.5 },
        { x: 2190, y: 1495.5 },
        { x: 1495.5 + 500, y: 1495.5 + 500 },
        { x: 1495.5 - 400, y: 1495.5 + 400 },
        { x: 1495.5 + 200, y: 1495.5 - 600 },
    ];
    for (const p of samples) {
        const back = lens.distortPoint(lens.undistortPoint(p));
        assert.ok(
            Math.abs(back.x - p.x) < 1e-3 && Math.abs(back.y - p.y) < 1e-3,
            `round-trip mismatch for ${JSON.stringify(p)} -> ${JSON.stringify(back)}`,
        );
    }
});

test('FisheyeLens: distortion bends a point off the image center inward', () => {
    // For a positive-distortion fisheye, a point far from the principal point
    // in rectified coords should map to a fisheye pixel CLOSER to the center.
    const lens = new FisheyeLens(MIOVISION_FISHEYE_PARAMS);
    const cx = MIOVISION_FISHEYE_PARAMS.cx;
    const rectified = { x: cx + 2000, y: MIOVISION_FISHEYE_PARAMS.cy };
    const d = lens.distortPoint(rectified);
    const rRect = Math.abs(rectified.x - cx);
    const rDist = Math.abs(d.x - cx);
    assert.ok(rDist < rRect, `expected fisheye r=${rDist} < rectified r=${rRect}`);
});

test('curvedEdgePoints: returns endpoints when lens is null', () => {
    const pts = curvedEdgePoints({ x: 100, y: 200 }, { x: 300, y: 400 }, null);
    assert.equal(pts.length, 2);
    assert.deepEqual(pts[0], { x: 100, y: 200 });
    assert.deepEqual(pts[1], { x: 300, y: 400 });
});

test('curvedEdgePoints: produces samples+1 points and starts/ends near originals', () => {
    const lens = new FisheyeLens(MIOVISION_FISHEYE_PARAMS);
    const p1 = { x: 900, y: 1495.5 };
    const p2 = { x: 2090, y: 1495.5 };
    const pts = curvedEdgePoints(p1, p2, lens, 8);
    assert.equal(pts.length, 9);
    assert.ok(Math.abs(pts[0].x - p1.x) < 1e-3 && Math.abs(pts[0].y - p1.y) < 1e-3);
    assert.ok(Math.abs(pts[pts.length - 1].x - p2.x) < 1e-3
        && Math.abs(pts[pts.length - 1].y - p2.y) < 1e-3);
});

test('FisheyeLens: undistortPoint stays finite outside the image circle', () => {
    const lens = new FisheyeLens(MIOVISION_FISHEYE_PARAMS);
    // Sensor corner is well outside the lens projection's image circle.
    const u = lens.undistortPoint({ x: 50, y: 50 });
    assert.ok(Number.isFinite(u.x) && Number.isFinite(u.y), 'expected finite output');
});

test('curvedEdgePoints: a horizontal chord off-center bows away from a straight line', () => {
    // A straight rectified chord that does NOT pass through the image center
    // should curve in fisheye image space (its midpoint should not lie on the
    // straight line between the endpoints in fisheye coords).
    const lens = new FisheyeLens(MIOVISION_FISHEYE_PARAMS);
    // Chord well above the principal point but inside the image circle.
    const p1 = { x: 1000, y: 1000 };
    const p2 = { x: 1991, y: 1000 };
    const pts = curvedEdgePoints(p1, p2, lens, 16);
    const mid = pts[Math.floor(pts.length / 2)];
    // Straight-line midpoint between p1 and p2 in fisheye coords
    const straightMidY = (p1.y + p2.y) / 2;
    assert.ok(
        Math.abs(mid.y - straightMidY) > 1.0,
        `expected curve midpoint to deviate from straight line, deviation=${mid.y - straightMidY}`,
    );
});
