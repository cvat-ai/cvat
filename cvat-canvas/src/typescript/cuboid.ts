// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import consts from './consts';
import { Point } from './shared';

export enum Orientation {
    LEFT = 'left',
    RIGHT = 'right',
}

export type RotationAxis = 'roll' | 'pitch' | 'yaw';

// Structural subset of FisheyeLens. Declared here to avoid a cyclic import
// between cuboid.ts and lensModel.ts.
export interface LensLike {
    undistortPoint(p: Point): Point;
    distortPoint(p: Point): Point;
}

interface Vec3 { x: number; y: number; z: number; }

export function intersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    // Check if none of the lines are of length 0
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    const { x: x3, y: y3 } = p3;
    const { x: x4, y: y4 } = p4;

    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return null;
    }

    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    // Lines are parallel
    if (Math.abs(denominator) < Number.EPSILON) {
        return null;
    }

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;

    // Return a object with the x and y coordinates of the intersection
    return { x: x1 + ua * (x2 - x1), y: y1 + ua * (y2 - y1) };
}

export class Equation {
    private a: number;
    private b: number;
    private c: number;

    public constructor(p1: Point, p2: Point) {
        this.a = p1.y - p2.y;
        this.b = p2.x - p1.x;
        this.c = this.b * p1.y + this.a * p1.x;
    }

    // get the line equation in actual coordinates
    public getY(x: number): number {
        return (this.c - this.a * x) / this.b;
    }
}

export class Figure {
    private indices: number[];
    private allPoints: Point[];

    public constructor(indices: number[], points: Point[]) {
        this.indices = indices;
        this.allPoints = points;
    }

    public get points(): Point[] {
        const points = [];
        for (const index of this.indices) {
            points.push(this.allPoints[index]);
        }
        return points;
    }

    // sets the point for a given edge, points must be given in
    // array form in the same ordering as the getter
    // if you only need to update a subset of the points,
    // simply put null for the points you want to keep
    public set points(newPoints) {
        const oldPoints = this.allPoints;
        for (let i = 0; i < newPoints.length; i += 1) {
            if (newPoints[i] !== null) {
                oldPoints[this.indices[i]] = { x: newPoints[i].x, y: newPoints[i].y };
            }
        }
    }
}

export class Edge extends Figure {
    public getEquation(): Equation {
        return new Equation(this.points[0], this.points[1]);
    }
}

export class CuboidModel {
    public points: Point[];
    private fr: Edge;
    private fl: Edge;
    private dr: Edge;
    private dl: Edge;
    private ft: Edge;
    private rt: Edge;
    private lt: Edge;
    private dt: Edge;
    private fb: Edge;
    private rb: Edge;
    private lb: Edge;
    private db: Edge;
    public edgeList: Edge[];
    private front: Figure;
    private right: Figure;
    private dorsal: Figure;
    private left: Figure;
    private top: Figure;
    private bot: Figure;
    public facesList: Figure[];
    public vpl: Point | null;
    public vpr: Point | null;
    public orientation: Orientation;
    // When true, BOTH the front and back faces are decoupled from the
    // perspective model:
    //   - none of the four side edges (fl, fr, dl, dr) are forced vertical
    //   - buildBackEdge() is not invoked (back face points stay user-controlled)
    //   - per-corner handles on indices 0..7 become individually draggable
    // Useful for calibrating cuboids on lens-distorted (e.g. fisheye) images
    // where the perspective vanishing-point assumption breaks down.
    public freeFaceMode: boolean;

    public constructor(points?: Point[]) {
        this.points = points;
        this.initEdges();
        this.initFaces();
        // Auto-detect a cuboid that was previously edited in free-face mode.
        // The wire format is unchanged (still 8 points), so we infer the flag
        // from geometry: if ANY of the four side edges is non-vertical the
        // cuboid can only have come from free-face mode (this also covers
        // legacy cuboids that were saved with only the back face freed in the
        // earlier "Free back face" implementation).
        const eps = 0.5;
        const sideEdgesVertical = points && points.length === 8 && (
            Math.abs(points[0].x - points[1].x) < eps && // fl
            Math.abs(points[2].x - points[3].x) < eps && // fr
            Math.abs(points[4].x - points[5].x) < eps && // dr
            Math.abs(points[6].x - points[7].x) < eps    // dl
        );
        this.freeFaceMode = !sideEdgesVertical;

        this.updateVanishingPoints(false);
        if (!this.freeFaceMode) {
            this.buildBackEdge(false);
        }
        this.updatePoints();
        this.updateOrientation();
    }

    public getPoints(): Point[] {
        return this.points;
    }

    public setPoints(points: (Point | null)[]): void {
        points.forEach((point: Point | null, i: number): void => {
            if (point !== null) {
                this.points[i].x = point.x;
                this.points[i].y = point.y;
            }
        });
    }

    public updateOrientation(): void {
        if (this.dl.points[0].x > this.fl.points[0].x) {
            this.orientation = Orientation.LEFT;
        } else {
            this.orientation = Orientation.RIGHT;
        }
    }

    public updatePoints(): void {
        // In standard mode the front face is the perspective anchor: FL/FR
        // (and via buildBackEdge -> updatePoints, DL/DR) are forced vertical.
        // In free-face mode no side edge is forced vertical so the user can
        // freely move every individual corner to compensate for lens distortion.
        if (this.freeFaceMode) return;

        this.fr.points[0].x = this.fr.points[1].x;
        this.fl.points[0].x = this.fl.points[1].x;
        this.dr.points[0].x = this.dr.points[1].x;
        this.dl.points[0].x = this.dl.points[1].x;
    }

    /**
     * Rotate the cuboid in-place around its local centroid by `angleRad`
     * about a single axis (roll / pitch / yaw). Used by the on-canvas
     * rotation gizmo introduced in INT-5976.
     *
     * Approach (option B from the plan — "weak-perspective lift"):
     *   1. Optionally undistort the 8 image points through the lens.
     *   2. Compute their centroid (rectified pixel space).
     *   3. Lift each point to a 3D box-local position by treating front-face
     *      points (indices 0..3) as z = -d/2 and back-face points (4..7) as
     *      z = +d/2, where d = ‖meanBack − meanFront‖.
     *   4. Apply a single-axis rotation in the local frame.
     *   5. Re-project with weak perspective (centroid as principal point,
     *      `focalPx` as focal length).
     *   6. Optionally re-distort through the lens and write back.
     *
     * Side effects: forces `freeFaceMode = true`, since after a rotation the
     * side edges are generally no longer vertical and the perspective rebuild
     * (buildBackEdge/updatePoints) would otherwise destroy the rotation.
     * This matches the auto-detect logic in the constructor.
     */
    public rotateCuboid(
        axis: RotationAxis,
        angleRad: number,
        focalPx: number,
        lens?: LensLike | null,
        halfDepthOverride?: number,
        pivotOverride?: Point | null,
    ): void {
        if (!this.points || this.points.length !== 8 || !angleRad || !Number.isFinite(angleRad)) {
            return;
        }

        // IMPORTANT: rotate directly in image-pixel (distorted) space.
        //
        // Earlier this method did `undistort -> rotate-as-3D-box -> distort`,
        // which produced the "thin / pinched cuboid" regression with lens
        // calibration on (INT-5976). The reasons that pipeline was wrong:
        //
        //  - `lens.undistortPoint` returns rectified-pinhole coordinates, not
        //    metric 3D-box coordinates. The relative spacing of the 8 corners
        //    in that space is severely non-uniform (off-axis cuboids get
        //    sheared, near-horizon points blow up to ~1e6 — see lensModel.ts
        //    `undistortPoint`). Lifting that warped 2D layout to z = ±d/2 and
        //    rotating it is NOT a rigid box rotation.
        //  - `distortPoint` is highly non-linear, so re-distorting each
        //    rotated corner individually maps small rectified-space shifts to
        //    wildly different fisheye-pixel offsets. The 8 corners get pushed
        //    around non-uniformly relative to the visual centroid, which is
        //    what collapsed the cuboid into a thin shape.
        //
        // The 8 stored corners ARE the visual anchors of the cuboid in image
        // space — the lens overlay simply curves the EDGES between them
        // (lensModel.ts `curvedEdgePoints`). Applying a rigid 3D-box rotation
        // to those anchors and writing the result straight back keeps the
        // anchors where the user expects, and the overlay re-curves the
        // edges between the new positions automatically.
        void lens;
        void focalPx;

        const src: Point[] = this.points.map((p) => ({ x: p.x, y: p.y }));

        // Pivot. Prefer the caller-supplied visual centroid (the same point
        // the gizmo is rendered at — `cuboidCentroid()` in svg.patch.ts which
        // averages all 12 curved-edge samples when a lens is active). Without
        // a pivot override we fall back to the 8-corner mean, which equals
        // the visual centroid for the no-lens (straight-edged) case.
        const c: Point = (
            pivotOverride &&
            Number.isFinite(pivotOverride.x) &&
            Number.isFinite(pivotOverride.y)
        )
            ? { x: pivotOverride.x, y: pivotOverride.y }
            : src.reduce(
                (acc, p) => ({ x: acc.x + p.x / 8, y: acc.y + p.y / 8 }),
                { x: 0, y: 0 },
            );

        // Local frame depth, in image-pixel space (consistent with src).
        // Prefer a stable, gesture-scoped depth captured at drag start so the
        // cuboid doesn't "breathe" as the box rotates and the 2D distance
        // between the front- and back-face centroids changes.
        let halfDepth: number;
        if (typeof halfDepthOverride === 'number' && Number.isFinite(halfDepthOverride) && halfDepthOverride > 0) {
            halfDepth = halfDepthOverride;
        } else {
            const meanIdx = (idxs: number[]): Point => idxs.reduce(
                (a, i) => ({ x: a.x + src[i].x / idxs.length, y: a.y + src[i].y / idxs.length }),
                { x: 0, y: 0 },
            );
            const front = meanIdx([0, 1, 2, 3]);
            const back = meanIdx([4, 5, 6, 7]);
            halfDepth = (Math.hypot(back.x - front.x, back.y - front.y) || 1) / 2;
        }

        // Lift to 3D in box-local frame (centroid-relative, rigid box).
        const lifted: Vec3[] = src.map((p, i) => ({
            x: p.x - c.x,
            y: p.y - c.y,
            z: i < 4 ? -halfDepth : +halfDepth,
        }));

        // Rotation matrix application (single axis).
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const rotate = (v: Vec3): Vec3 => {
            if (axis === 'roll') {
                return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos, z: v.z };
            }
            if (axis === 'pitch') {
                return { x: v.x, y: v.y * cos - v.z * sin, z: v.y * sin + v.z * cos };
            }
            // yaw
            return { x: v.x * cos + v.z * sin, y: v.y, z: -v.x * sin + v.z * cos };
        };

        // Orthographic re-projection (drop z, add centroid back) and write
        // back directly — no re-distortion step.
        const finalPts: Point[] = lifted.map(rotate).map((v) => (
            { x: c.x + v.x, y: c.y + v.y }
        ));
        for (let i = 0; i < 8; i += 1) {
            this.points[i].x = finalPts[i].x;
            this.points[i].y = finalPts[i].y;
        }

        // After any rotation the side edges are no longer vertical; flip
        // into freeFaceMode so subsequent edits use the per-corner handles
        // and updatePoints() does not re-verticalise the box.
        this.freeFaceMode = true;
        this.updateOrientation();
    }

    public computeSideEdgeConstraints(edge: any): any {
        const midLength = this.fr.points[1].y - this.fr.points[0].y - 1;

        const minY = edge.points[1].y - midLength;
        const maxY = edge.points[0].y + midLength;

        const y1 = edge.points[0].y;
        const y2 = edge.points[1].y;

        const miny1 = y2 - midLength;
        const maxy1 = y2 - consts.MIN_EDGE_LENGTH;

        const miny2 = y1 + consts.MIN_EDGE_LENGTH;
        const maxy2 = y1 + midLength;

        return {
            constraint: {
                minY,
                maxY,
            },
            y1Range: {
                max: maxy1,
                min: miny1,
            },
            y2Range: {
                max: maxy2,
                min: miny2,
            },
        };
    }

    // boolean value parameter controls which edges should be used to recalculate vanishing points
    private updateVanishingPoints(buildright: boolean): void {
        let leftEdge = [];
        let rightEdge = [];
        let midEdge = [];
        if (buildright) {
            leftEdge = this.fr.points;
            rightEdge = this.dl.points;
            midEdge = this.fl.points;
        } else {
            leftEdge = this.fl.points;
            rightEdge = this.dr.points;
            midEdge = this.fr.points;
        }

        this.vpl = intersection(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        this.vpr = intersection(rightEdge[0], midEdge[0], rightEdge[1], midEdge[1]);
        if (this.vpl === null) {
            // shift the edge slightly to avoid edge case
            leftEdge[0].y -= 0.001;
            leftEdge[0].x += 0.001;
            leftEdge[1].x += 0.001;
            this.vpl = intersection(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        }
        if (this.vpr === null) {
            // shift the edge slightly to avoid edge case
            rightEdge[0].y -= 0.001;
            rightEdge[0].x -= 0.001;
            rightEdge[1].x -= 0.001;
            this.vpr = intersection(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        }
    }

    private initEdges(): void {
        this.fl = new Edge([0, 1], this.points);
        this.fr = new Edge([2, 3], this.points);
        this.dr = new Edge([4, 5], this.points);
        this.dl = new Edge([6, 7], this.points);

        this.ft = new Edge([0, 2], this.points);
        this.lt = new Edge([0, 6], this.points);
        this.rt = new Edge([2, 4], this.points);
        this.dt = new Edge([6, 4], this.points);

        this.fb = new Edge([1, 3], this.points);
        this.lb = new Edge([1, 7], this.points);
        this.rb = new Edge([3, 5], this.points);
        this.db = new Edge([7, 5], this.points);

        this.edgeList = [
            this.fl,
            this.fr,
            this.dl,
            this.dr,
            this.ft,
            this.lt,
            this.rt,
            this.dt,
            this.fb,
            this.lb,
            this.rb,
            this.db,
        ];
    }

    private initFaces(): void {
        this.front = new Figure([0, 1, 3, 2], this.points);
        this.right = new Figure([2, 3, 5, 4], this.points);
        this.dorsal = new Figure([4, 5, 7, 6], this.points);
        this.left = new Figure([6, 7, 1, 0], this.points);
        this.top = new Figure([0, 2, 4, 6], this.points);
        this.bot = new Figure([1, 3, 5, 7], this.points);

        this.facesList = [this.front, this.right, this.dorsal, this.left];
    }

    private buildBackEdge(buildright: boolean): void {
        this.updateVanishingPoints(buildright);
        let leftPoints = [];
        let rightPoints = [];

        let topIndex = 0;
        let botIndex = 0;

        if (buildright) {
            leftPoints = this.dl.points;
            rightPoints = this.fr.points;
            topIndex = 4;
            botIndex = 5;
        } else {
            leftPoints = this.dr.points;
            rightPoints = this.fl.points;
            topIndex = 6;
            botIndex = 7;
        }

        const vpLeft = this.vpl;
        const vpRight = this.vpr;

        let p1 = intersection(vpLeft, leftPoints[0], vpRight, rightPoints[0]);
        let p2 = intersection(vpLeft, leftPoints[1], vpRight, rightPoints[1]);

        if (p1 === null) {
            p1 = { x: p2.x, y: vpLeft.y };
        } else if (p2 === null) {
            p2 = { x: p1.x, y: vpLeft.y };
        }

        this.points[topIndex] = { x: p1.x, y: p1.y };
        this.points[botIndex] = { x: p2.x, y: p2.y };

        // Making sure that the vertical edges stay vertical
        this.updatePoints();
    }
}

function sortPointsClockwise(points: any[]): any[] {
    points.sort((a, b): number => a.y - b.y);
    // Get center y
    const cy = (points[0].y + points[points.length - 1].y) / 2;

    // Sort from right to left
    points.sort((a, b): number => b.x - a.x);

    // Get center x
    const cx = (points[0].x + points[points.length - 1].x) / 2;

    // Center point
    const center = {
        x: cx,
        y: cy,
    };

    // Starting angle used to reference other angles
    let startAng: number | undefined;
    points.forEach((point): void => {
        let ang = Math.atan2(point.y - center.y, point.x - center.x);
        if (!startAng) {
            startAng = ang;
            // ensure that all points are clockwise of the start point
        } else if (ang < startAng) {
            ang += Math.PI * 2;
        }
        // eslint-disable-next-line no-param-reassign
        point.angle = ang; // add the angle to the point
    });

    // first sort clockwise
    points.sort((a, b): number => a.angle - b.angle);
    return points.reverse();
}

function setupCuboidPoints(points: Point[]): any[] {
    let left;
    let right;
    let left2;
    let right2;
    let p1;
    let p2;
    let p3;
    let p4;

    const height = Math.abs(points[0].x - points[1].x) < Math.abs(points[1].x - points[2].x) ?
        Math.abs(points[1].y - points[0].y) : Math.abs(points[1].y - points[2].y);

    // separate into left and right point
    // we pick the first and third point because we know assume they will be on
    // opposite corners
    if (points[0].x < points[2].x) {
        [left, , right] = points;
    } else {
        [right, , left] = points;
    }

    // get other 2 points using the given height
    if (left.y < right.y) {
        left2 = { x: left.x, y: left.y + height };
        right2 = { x: right.x, y: right.y - height };
    } else {
        left2 = { x: left.x, y: left.y - height };
        right2 = { x: right.x, y: right.y + height };
    }

    // get the vector for the last point relative to the previous point
    const vec = {
        x: points[3].x - points[2].x,
        y: points[3].y - points[2].y,
    };

    if (left.y < left2.y) {
        p1 = left;
        p2 = left2;
    } else {
        p1 = left2;
        p2 = left;
    }

    if (right.y < right2.y) {
        p3 = right;
        p4 = right2;
    } else {
        p3 = right2;
        p4 = right;
    }

    const p5 = { x: p3.x + vec.x, y: p3.y + vec.y + 0.1 };
    const p6 = { x: p4.x + vec.x, y: p4.y + vec.y - 0.1 };
    const p7 = { x: p1.x + vec.x, y: p1.y + vec.y + 0.1 };
    const p8 = { x: p2.x + vec.x, y: p2.y + vec.y - 0.1 };

    p1.y += 0.1;
    return [p1, p2, p3, p4, p5, p6, p7, p8];
}

export function cuboidFrom4Points(flattenedPoints: any[]): any[] {
    const points: Point[] = [];
    for (let i = 0; i < 4; i++) {
        const [x, y] = flattenedPoints.slice(i * 2, i * 2 + 2);
        points.push({ x, y });
    }
    const unsortedPlanePoints = points.slice(0, 3);
    function rotate(array: any[], times: number): void {
        let t = times;
        while (t--) {
            const temp = array.shift();
            array.push(temp);
        }
    }

    const plane2 = {
        p1: points[0],
        p2: points[0],
        p3: points[0],
        p4: points[0],
    };

    // completing the plane
    const vector = {
        x: points[2].x - points[1].x,
        y: points[2].y - points[1].y,
    };

    // sorting the first plane
    unsortedPlanePoints.push({
        x: points[0].x + vector.x,
        y: points[0].y + vector.y,
    });
    const sortedPlanePoints = sortPointsClockwise(unsortedPlanePoints);
    let leftIndex = 0;
    for (let i = 0; i < 4; i++) {
        leftIndex = sortedPlanePoints[i].x < sortedPlanePoints[leftIndex].x ? i : leftIndex;
    }
    rotate(sortedPlanePoints, leftIndex);
    const plane1 = {
        p1: sortedPlanePoints[0],
        p2: sortedPlanePoints[1],
        p3: sortedPlanePoints[2],
        p4: sortedPlanePoints[3],
    };

    const vec = {
        x: points[3].x - points[2].x,
        y: points[3].y - points[2].y,
    };
    // determine the orientation
    const angle = Math.atan2(vec.y, vec.x);

    // making the other plane
    plane2.p1 = { x: plane1.p1.x + vec.x, y: plane1.p1.y + vec.y };
    plane2.p2 = { x: plane1.p2.x + vec.x, y: plane1.p2.y + vec.y };
    plane2.p3 = { x: plane1.p3.x + vec.x, y: plane1.p3.y + vec.y };
    plane2.p4 = { x: plane1.p4.x + vec.x, y: plane1.p4.y + vec.y };

    let cuboidPoints;
    // right
    if (Math.abs(angle) < Math.PI / 2 - 0.1) {
        cuboidPoints = setupCuboidPoints(points);
        // left
    } else if (Math.abs(angle) > Math.PI / 2 + 0.1) {
        cuboidPoints = setupCuboidPoints(points);
        // down
    } else if (angle > 0) {
        cuboidPoints = [plane1.p1, plane2.p1, plane1.p2, plane2.p2, plane1.p3, plane2.p3, plane1.p4, plane2.p4];
        cuboidPoints[0].y += 0.1;
        cuboidPoints[4].y += 0.1;
        // up
    } else {
        cuboidPoints = [plane2.p1, plane1.p1, plane2.p2, plane1.p2, plane2.p3, plane1.p3, plane2.p4, plane1.p4];
        cuboidPoints[0].y += 0.1;
        cuboidPoints[4].y += 0.1;
    }

    return cuboidPoints.reduce((arr: number[], point: any): number[] => {
        arr.push(point.x);
        arr.push(point.y);
        return arr;
    }, []);
}
