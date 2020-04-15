/* eslint-disable func-names */
/* eslint-disable no-underscore-dangle */
/* eslint-disable curly */
/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

import consts from './consts';

export interface Point {
    x: number;
    y: number;
}

function line(p1: Point, p2: Point): number[] {
    const a = p1.y - p2.y;
    const b = p2.x - p1.x;
    const c = b * p1.y + a * p1.x;
    return [a, b, c];
}

function intersection(
    p1: Point, p2: Point, p3: Point, p4: Point,
): Point | null {
    const L1 = line(p1, p2);
    const L2 = line(p3, p4);

    const D = L1[0] * L2[1] - L1[1] * L2[0];
    const Dx = L1[2] * L2[1] - L1[1] * L2[2];
    const Dy = L1[0] * L2[2] - L1[2] * L2[0];

    let x = null;
    let y = null;
    if (D !== 0) {
        x = Dx / D;
        y = Dy / D;
        return { x, y };
    }

    return null;
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
        for (let i = 0; i < newPoints.length; i += 1) {
            if (newPoints[i] !== null) {
                this.allPoints[this.indices[i]] = { x: newPoints[i].x, y: newPoints[i].y };
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

    public constructor(points?: Point[]) {
        this.points = points;
        this.initEdges();
        this.initFaces();
        this.updateVanishingPoints();
        this.buildBackEdge();
        this.updatePoints();
    }

    public getPoints(): Point[] {
        return this.points;
    }

    public setPoints(points: Point[]): void {
        this.points = points;
    }

    public updatePoints(): void {
        // making sure that the edges are vertical
        this.fr.points[0].x = this.fr.points[1].x;
        this.fl.points[0].x = this.fl.points[1].x;
        this.dr.points[0].x = this.dr.points[1].x;
        this.dl.points[0].x = this.dl.points[1].x;
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
    private updateVanishingPoints(): void {
        const leftEdge = this.fl.points;
        const rightEdge = this.dr.points;
        const midEdge = this.fr.points;

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

        this.edgeList = [this.fl, this.fr, this.dl, this.dr, this.ft, this.lt,
            this.rt, this.dt, this.fb, this.lb, this.rb, this.db];
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

    private buildBackEdge(): void {
        this.updateVanishingPoints();
        const leftPoints = this.dr.points;
        const rightPoints = this.fl.points;
        const topIndex = 6;
        const botIndex = 7;

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

function setupCuboidPoints(actualPoints: any[]): any[] {
    let left;
    let right;
    let left2;
    let right2;
    let p1;
    let p2;
    let p3;
    let p4;

    const height = Math.abs(actualPoints[0].x - actualPoints[1].x)
        < Math.abs(actualPoints[1].x - actualPoints[2].x)
        ? Math.abs(actualPoints[1].y - actualPoints[0].y)
        : Math.abs(actualPoints[1].y - actualPoints[2].y);

    // seperate into left and right point
    // we pick the first and third point because we know assume they will be on
    // opposite corners
    if (actualPoints[0].x < actualPoints[2].x) {
        [left,, right] = actualPoints;
    } else {
        [right,, left] = actualPoints;
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
        x: actualPoints[3].x - actualPoints[2].x,
        y: actualPoints[3].y - actualPoints[2].y,
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

export function cuboidPointsBy4Points(points: any[]): any[] {
    const actualPoints = [];
    for (let i = 0; i < 4; i++) {
        const [x, y] = points.slice(i * 2, i * 2 + 2);
        actualPoints.push({ x, y });
    }
    const unsortedPlanePoints = actualPoints.slice(0, 3);
    function rotate(array: any[], times: number): void{
        let t = times;
        while (t--) {
            const temp = array.shift();
            array.push(temp);
        }
    }

    const plane2 = {
        p1: actualPoints[0],
        p2: actualPoints[0],
        p3: actualPoints[0],
        p4: actualPoints[0],
    };

    // completing the plane
    const vector = {
        x: actualPoints[2].x - actualPoints[1].x,
        y: actualPoints[2].y - actualPoints[1].y,
    };

    // sorting the first plane
    unsortedPlanePoints.push({
        x: actualPoints[0].x + vector.x,
        y: actualPoints[0].y + vector.y,
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
        x: actualPoints[3].x - actualPoints[2].x,
        y: actualPoints[3].y - actualPoints[2].y,
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
        cuboidPoints = setupCuboidPoints(actualPoints);
    // left
    } else if (Math.abs(angle) > Math.PI / 2 + 0.1) {
        cuboidPoints = setupCuboidPoints(actualPoints);
    // down
    } else if (angle > 0) {
        cuboidPoints = [
            plane1.p1, plane2.p1, plane1.p2, plane2.p2,
            plane1.p3, plane2.p3, plane1.p4, plane2.p4,
        ];
        cuboidPoints[0].y += 0.1;
        cuboidPoints[4].y += 0.1;
    // up
    } else {
        cuboidPoints = [
            plane2.p1, plane1.p1, plane2.p2, plane1.p2,
            plane2.p3, plane1.p3, plane2.p4, plane1.p4,
        ];
        cuboidPoints[0].y += 0.1;
        cuboidPoints[4].y += 0.1;
    }

    return cuboidPoints.reduce((arr: number[], point: any): number[] => {
        arr.push(point.x);
        arr.push(point.y);
        return arr;
    }, []);
}
