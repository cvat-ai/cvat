// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */
import * as SVG from 'svg.js';
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

import consts from './consts';
import { Equation, CuboidModel, Orientation, Edge, RotationAxis } from './cuboid';
import { Point, parsePoints, clamp } from './shared';
import {
    FisheyeLens, FisheyeParams, curvedEdgePoints, pointsToPathD, faceToCurvedPathD,
} from './lensModel';

// Update constructor
const originalDraw = SVG.Element.prototype.draw;
SVG.Element.prototype.draw = function constructor(...args: any): any {
    let handler = this.remember('_paintHandler');
    if (!handler) {
        originalDraw.call(this, ...args);
        handler = this.remember('_paintHandler');
        // There is use case (drawing a single point when handler is created and destructed immediately in one stack)
        // So, we need to check if handler still exists
        if (handler && !handler.set) {
            handler.set = new SVG.Set();
        }
    } else {
        originalDraw.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalDraw)) {
    SVG.Element.prototype.draw[key] = originalDraw[key];
}

// Create undo for polygons and polylines
function undo(): void {
    if (this.set && this.set.length()) {
        this.set.members.splice(-1, 1)[0].remove();
        this.el.array().value.splice(-2, 1);
        this.el.plot(this.el.array());
        this.el.fire('undopoint');
    }
}

SVG.Element.prototype.draw.extend(
    'polyline',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polyline, {
        undo: undo,
    }),
);

SVG.Element.prototype.draw.extend(
    'polygon',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polygon, {
        undo: undo,
    }),
);

export const CIRCLE_STROKE = '#000';
// Fix method drawCircles
function drawCircles(): void {
    const array = this.el.array().valueOf();

    this.set.each(function (): void {
        this.remove();
    });

    this.set.clear();

    for (let i = 0; i < array.length - 1; ++i) {
        [this.p.x] = array[i];
        [, this.p.y] = array[i];

        const p = this.p.matrixTransform(
            this.parent.node.getScreenCTM().inverse().multiply(this.el.node.getScreenCTM()),
        );

        this.set.add(
            this.parent
                .circle(5)
                .stroke({
                    width: 1,
                    color: CIRCLE_STROKE,
                })
                .fill('#ccc')
                .center(p.x, p.y),
        );
    }
}

SVG.Element.prototype.draw.extend(
    'line',
    Object.assign({}, SVG.Element.prototype.draw.plugins.line, {
        drawCircles: drawCircles,
    }),
);

SVG.Element.prototype.draw.extend(
    'polyline',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polyline, {
        drawCircles: drawCircles,
    }),
);

SVG.Element.prototype.draw.extend(
    'polygon',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polygon, {
        drawCircles: drawCircles,
    }),
);

// Fix method drag
const originalDraggable = SVG.Element.prototype.draggable;
SVG.Element.prototype.draggable = function constructor(...args: any): any {
    let handler = this.remember('_draggable');
    if (!handler) {
        originalDraggable.call(this, ...args);
        handler = this.remember('_draggable');
        handler.drag = function (e: any) {
            this.m = this.el.node.getScreenCTM().inverse();
            return handler.constructor.prototype.drag.call(this, e);
        };
    } else {
        originalDraggable.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalDraggable)) {
    SVG.Element.prototype.draggable[key] = originalDraggable[key];
}

// Fix method resize
const originalResize = SVG.Element.prototype.resize;
SVG.Element.prototype.resize = function constructor(...args: any): any {
    let handler = this.remember('_resizeHandler');
    if (!handler) {
        originalResize.call(this, ...args);
        handler = this.remember('_resizeHandler');
        handler.resize = function (e: any) {
            const { event } = e.detail;
            this.rotationPointPressed = e.type === 'rot';
            if (
                event.button === 0 &&
                // ignore shift key for cuboids (change perspective) and rectangles (precise rotation)
                (!event.shiftKey || (
                    this.el.parent().hasClass('cvat_canvas_shape_cuboid')
                    || this.el.type  === 'rect')
                ) && !event.altKey
            ) {
                return handler.constructor.prototype.resize.call(this, e);
            }
        };
        handler.update = function (e: any) {
            if (!this.rotationPointPressed) {
                this.m = this.el.node.getScreenCTM().inverse();
            }
            handler.constructor.prototype.update.call(this, e);
        };
    } else {
        originalResize.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalResize)) {
    SVG.Element.prototype.resize[key] = originalResize[key];
}

enum EdgeIndex {
    FL = 1,
    FR = 2,
    DR = 3,
    DL = 4,
}

function getEdgeIndex(cuboidPoint: number): EdgeIndex {
    switch (cuboidPoint) {
        case 0:
        case 1:
            return EdgeIndex.FL;
        case 2:
        case 3:
            return EdgeIndex.FR;
        case 4:
        case 5:
            return EdgeIndex.DR;
        default:
            return EdgeIndex.DL;
    }
}

function getTopDown(edgeIndex: EdgeIndex): number[] {
    switch (edgeIndex) {
        case EdgeIndex.FL:
            return [0, 1];
        case EdgeIndex.FR:
            return [2, 3];
        case EdgeIndex.DR:
            return [4, 5];
        default:
            return [6, 7];
    }
}

(SVG as any).Cube = SVG.invent({
    create: 'g',
    inherit: SVG.G,
    extend: {
        constructorMethod(points: string, opts?: { lens?: FisheyeParams | null; offset?: number }) {
            this.cuboidModel = new CuboidModel(parsePoints(points));
            this.setupFaces();
            this.setupEdges();
            this.setupProjections();
            this.hideProjections();
            this.setupLensOverlay();

            this._attr('points', points);
            this.addClass('cvat_canvas_shape_cuboid');
            if (opts && opts.lens) {
                this.setLens(opts.lens, opts.offset ?? 0);
            }
            return this;
        },

        setupLensOverlay() {
            this.lens = null as FisheyeLens | null;
            // A child <g> that holds the curved overlay rendering. Hidden by
            // default; shown when a lens is set. Children inherit stroke/fill
            // from the parent cube group, so they stay color-correct.
            this.lensOverlay = this.group().addClass('cvat_canvas_cuboid_lens_overlay');
            this.lensOverlay.attr('pointer-events', 'none');
            this.lensOverlay.hide();

            // 6 face overlay paths (curved closed outlines, low-opacity fill).
            this.lensFaceBot = this.lensOverlay.path('').attr('fill-rule', 'evenodd');
            this.lensFaceTop = this.lensOverlay.path('').attr('fill-rule', 'evenodd');
            this.lensFaceRight = this.lensOverlay.path('').attr('fill-rule', 'evenodd');
            this.lensFaceLeft = this.lensOverlay.path('').attr('fill-rule', 'evenodd');
            this.lensFaceDorsal = this.lensOverlay.path('').attr('fill-rule', 'evenodd');
            this.lensFaceFront = this.lensOverlay.path('').attr('fill-rule', 'evenodd');

            // 12 edge overlay paths (curved strokes, no fill). The four
            // "front" edges are created LAST so they're appended to the SVG
            // group after the side/back edges; SVG renders later children on
            // top, which guarantees the grey perspective-face outline paints
            // over the blue side/back edges at shared corners.
            const edgePath = (cls?: string): any => {
                const p = this.lensOverlay.path('').attr('fill', 'none');
                if (cls) p.addClass(cls);
                return p;
            };
            this.lensEdgeDR = edgePath();
            this.lensEdgeDL = edgePath();
            this.lensEdgeRT = edgePath();
            this.lensEdgeLT = edgePath();
            this.lensEdgeDT = edgePath();
            this.lensEdgeRB = edgePath();
            this.lensEdgeLB = edgePath();
            this.lensEdgeDB = edgePath();
            this.lensEdgeFL = edgePath('cvat_canvas_cuboid_front_edge');
            this.lensEdgeFR = edgePath('cvat_canvas_cuboid_front_edge');
            this.lensEdgeFT = edgePath('cvat_canvas_cuboid_front_edge');
            this.lensEdgeFB = edgePath('cvat_canvas_cuboid_front_edge');
        },

        setLens(params: FisheyeParams | null, offset = 0) {
            this.lensParams = params;
            this.lensOffset = offset;
            if (!params) {
                this.lens = null;
                this.lensOverlay.hide();
                this.removeClass('cvat_canvas_cuboid_lens_distorted');
                return;
            }
            // Cuboid corners live in SVG-canvas coordinates, which are image-pixel
            // coordinates shifted by `offset`. Bake that shift into the lens'
            // principal point so the lens consumes/produces SVG-canvas coords
            // directly. Without this, every interior curve sample is computed
            // against a wildly off-centre origin and the bow flips direction
            // near the periphery (see INT-5968).
            const width = params.horizontalResolution;
            const height = Math.round(width / params.aspectRatio);
            this.lens = new FisheyeLens({
                ...params,
                cx: (params.cx ?? width / 2) + offset,
                cy: (params.cy ?? height / 2) + offset,
            });
            this.addClass('cvat_canvas_cuboid_lens_distorted');
            this.lensOverlay.show();
            this.updateLensOverlay();
            // Re-apply the grey "perspective face" colouring to the curved
            // overlay edges; without this, switching lens calibration on after
            // the cuboid was created would leave the front edges with the
            // default cuboid stroke colour.
            this.paintOrientationLines();
        },

        updateLensOverlay() {
            if (!this.lens) return;
            const m = this.cuboidModel as any;
            const lens = this.lens as FisheyeLens;

            const setEdge = (el: any, e: Edge): void => {
                el.plot(pointsToPathD(curvedEdgePoints(e.points[0], e.points[1], lens)));
            };
            setEdge(this.lensEdgeFL, m.fl);
            setEdge(this.lensEdgeFR, m.fr);
            setEdge(this.lensEdgeDR, m.dr);
            setEdge(this.lensEdgeDL, m.dl);
            setEdge(this.lensEdgeFT, m.ft);
            setEdge(this.lensEdgeRT, m.rt);
            setEdge(this.lensEdgeLT, m.lt);
            setEdge(this.lensEdgeDT, m.dt);
            setEdge(this.lensEdgeFB, m.fb);
            setEdge(this.lensEdgeRB, m.rb);
            setEdge(this.lensEdgeLB, m.lb);
            setEdge(this.lensEdgeDB, m.db);

            const setFace = (el: any, corners: Point[]): void => {
                el.plot(faceToCurvedPathD(corners, lens));
            };
            setFace(this.lensFaceBot, m.bot.points);
            setFace(this.lensFaceTop, m.top.points);
            setFace(this.lensFaceRight, m.right.points);
            setFace(this.lensFaceLeft, m.left.points);
            setFace(this.lensFaceDorsal, m.dorsal.points);
            setFace(this.lensFaceFront, m.front.points);
        },

        setupFaces() {
            this.bot = this.polygon(this.cuboidModel.bot.points);
            this.top = this.polygon(this.cuboidModel.top.points);
            this.right = this.polygon(this.cuboidModel.right.points);
            this.left = this.polygon(this.cuboidModel.left.points);
            this.dorsal = this.polygon(this.cuboidModel.dorsal.points);
            this.face = this.polygon(this.cuboidModel.front.points);
        },

        setupProjections() {
            this.ftProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.ft.getEquation(),
                    this.cuboidModel.ft.points[0],
                    this.cuboidModel.vpl,
                ),
            );
            this.fbProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.fb.getEquation(),
                    this.cuboidModel.ft.points[0],
                    this.cuboidModel.vpl,
                ),
            );
            this.rtProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.rt.getEquation(),
                    this.cuboidModel.rt.points[1],
                    this.cuboidModel.vpr,
                ),
            );
            this.rbProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.rb.getEquation(),
                    this.cuboidModel.rb.points[1],
                    this.cuboidModel.vpr,
                ),
            );

            this.ftProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
            this.fbProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
            this.rtProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
            this.rbProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
        },

        setupEdges() {
            this.frontLeftEdge = this.line(this.cuboidModel.fl.points);
            this.frontRightEdge = this.line(this.cuboidModel.fr.points);
            this.dorsalRightEdge = this.line(this.cuboidModel.dr.points);
            this.dorsalLeftEdge = this.line(this.cuboidModel.dl.points);

            this.frontTopEdge = this.line(this.cuboidModel.ft.points);
            this.rightTopEdge = this.line(this.cuboidModel.rt.points);
            this.frontBotEdge = this.line(this.cuboidModel.fb.points);
            this.rightBotEdge = this.line(this.cuboidModel.rb.points);
        },

        setupGrabPoints(circleType: Function | string) {
            const viewModel = this.cuboidModel;
            const circle = typeof circleType === 'function' ? circleType : this.circle;

            this.flCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_l');
            this.frCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_r');
            this.ftCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_t');
            this.fbCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_b');

            this.drCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_ew');
            this.dlCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_ew');

            // Per-corner handles (only visible when freeFaceMode is on).
            // Cuboid model indices:
            //   front face: flt=0, flb=1, frt=2, frb=3
            //   back face : brt=4, brb=5, blt=6, blb=7
            this.bltCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_lt')
                .addClass('cvat_canvas_cuboid_free_corner');
            this.blbCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_lb')
                .addClass('cvat_canvas_cuboid_free_corner');
            this.brtCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_rt')
                .addClass('cvat_canvas_cuboid_free_corner');
            this.brbCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_rb')
                .addClass('cvat_canvas_cuboid_free_corner');
            this.fltCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_lt')
                .addClass('cvat_canvas_cuboid_free_corner');
            this.flbCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_lb')
                .addClass('cvat_canvas_cuboid_free_corner');
            this.frtCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_rt')
                .addClass('cvat_canvas_cuboid_free_corner');
            this.frbCenter = circle(0, 0)
                .addClass('svg_select_points')
                .addClass('svg_select_points_rb')
                .addClass('cvat_canvas_cuboid_free_corner');

            const grabPoints = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < grabPoints.length; i += 1) {
                const edge = edges[i];
                if (!edge) continue;
                const cx = (edge.attr('x2') + edge.attr('x1')) / 2;
                const cy = (edge.attr('y2') + edge.attr('y1')) / 2;
                grabPoints[i].center(cx, cy);
            }

            // Position per-corner handles directly on their points.
            this.positionFreeCornerHandles();

            if (viewModel.orientation === Orientation.LEFT) {
                this.dlCenter.hide();
            } else {
                this.drCenter.hide();
            }

            this.updateFreeCornerHandlesVisibility();
            // Rotation gizmo (INT-5976) is created alongside the grab points
            // so it shares the activation lifecycle.
            this.setupRotationGizmo();
        },

        positionFreeCornerHandles() {
            if (!this.bltCenter) return;
            const pts = this.cuboidModel.points;
            // Back face: blt=6, blb=7, brt=4, brb=5
            this.bltCenter.center(pts[6].x, pts[6].y);
            this.blbCenter.center(pts[7].x, pts[7].y);
            this.brtCenter.center(pts[4].x, pts[4].y);
            this.brbCenter.center(pts[5].x, pts[5].y);
            // Front face: flt=0, flb=1, frt=2, frb=3
            if (this.fltCenter) {
                this.fltCenter.center(pts[0].x, pts[0].y);
                this.flbCenter.center(pts[1].x, pts[1].y);
                this.frtCenter.center(pts[2].x, pts[2].y);
                this.frbCenter.center(pts[3].x, pts[3].y);
            }
        },

        // ── Rotation gizmo (INT-5976) ───────────────────────────────────
        // 3 colored arcs at the cuboid centroid. Always available when the
        // cuboid is selected; coexists with Free Face Mode.
        //   Roll  = red circle (screen plane)            → drag tangentially
        //   Pitch = green horizontal flat ellipse (X axis) → drag vertically
        //   Yaw   = blue  vertical   flat ellipse (Y axis) → drag horizontally
        cuboidCentroid(): { x: number; y: number } {
            const pts = this.cuboidModel.points;
            // Without a lens the 8 stored corners form a straight-edged
            // cuboid, so their mean is the perceived centroid.
            if (!this.lens) {
                return {
                    x: pts.reduce((s: number, p: Point) => s + p.x / 8, 0),
                    y: pts.reduce((s: number, p: Point) => s + p.y / 8, 0),
                };
            }
            // With a fisheye lens the 12 edges between the corners curve.
            // The simple 8-corner mean lands off the visible shape because
            // bowed edges shift the visual mass. Sample each curved edge
            // (same routine that draws the overlay) and average all samples
            // — this lands the gizmo on the perceived centroid of the
            // distorted cuboid (INT-5976 lens-aware fix).
            const edges: Edge[] = this.cuboidModel.edgeList;
            let sx = 0;
            let sy = 0;
            let n = 0;
            for (const e of edges) {
                const ep = e.points;
                const samples = curvedEdgePoints(ep[0], ep[1], this.lens);
                for (const s of samples) {
                    sx += s.x;
                    sy += s.y;
                    n += 1;
                }
            }
            if (n === 0) {
                return {
                    x: pts.reduce((s: number, p: Point) => s + p.x / 8, 0),
                    y: pts.reduce((s: number, p: Point) => s + p.y / 8, 0),
                };
            }
            return { x: sx / n, y: sy / n };
        },

        cuboidGizmoRadius(): number {
            const pts = this.cuboidModel.points;
            const xs = pts.map((p: Point) => p.x);
            const ys = pts.map((p: Point) => p.y);
            const w = Math.max(...xs) - Math.min(...xs);
            const h = Math.max(...ys) - Math.min(...ys);
            // ~10 % of the smaller bbox dim, clamped to [8, 18] image-pixels.
            // The tight upper bound prevents the arcs from ballooning when
            // certain rotations stretch the bbox; the lower bound keeps the
            // arcs grabbable on small cuboids. Kept compact so the gizmo
            // doesn't visually overwhelm large cuboids and obscure underlying
            // video pixels (INT-5976 tweak).
            return Math.max(8, Math.min(18, Math.min(w, h) * 0.1));
        },

        setupRotationGizmo() {
            const r = this.cuboidGizmoRadius();
            // Slightly thicker strokes give the arcs a larger hit area so
            // they are easier to click without obscuring the cuboid.
            const strokeWidth = 2.5;
            // Roll = full circle, screen plane.
            this.rotRoll = this.circle(r * 2)
                .fill('none')
                .stroke({ color: '#ff5252', width: strokeWidth })
                .addClass('cvat_canvas_cuboid_rot_gizmo')
                .addClass('cvat_canvas_cuboid_rot_gizmo_roll');
            // Pitch = vertical flat ellipse (blue). Dragging this arc
            // tangentially produces vertical motion, which matches the
            // pitch axis (rotation around the horizontal X axis).
            this.rotPitch = this.ellipse((r * 2) / 3, r * 2)
                .fill('none')
                .stroke({ color: '#1e88e5', width: strokeWidth })
                .addClass('cvat_canvas_cuboid_rot_gizmo')
                .addClass('cvat_canvas_cuboid_rot_gizmo_pitch');
            // Yaw = horizontal flat ellipse (green). Tangential drag is
            // horizontal, matching the yaw axis (rotation around vertical Y).
            this.rotYaw = this.ellipse(r * 2, (r * 2) / 3)
                .fill('none')
                .stroke({ color: '#43a047', width: strokeWidth })
                .addClass('cvat_canvas_cuboid_rot_gizmo')
                .addClass('cvat_canvas_cuboid_rot_gizmo_yaw');
            // Style hooks so the gizmo arcs are easy to grab even though
            // they are stroke-only (no fill = pointer-events would normally
            // ignore the interior of the ring).
            [this.rotRoll, this.rotPitch, this.rotYaw].forEach((g: any) => {
                g.attr('pointer-events', 'visibleStroke');
                g.style({ cursor: 'grab' });
            });
            // Translation dot at the centroid. Dragging this dot translates
            // the entire cuboid across the image without changing its
            // perspective — same behaviour as dragging the front face, but
            // exposed as an obvious affordance in the middle of the gizmo.
            const dotRadius = Math.max(2, r * 0.18);
            this.rotCenterDot = this.circle(dotRadius * 2)
                .fill('#000')
                .stroke({ color: '#fff', width: 0.5 })
                .addClass('cvat_canvas_cuboid_rot_gizmo')
                .addClass('cvat_canvas_cuboid_rot_gizmo_center');
            this.rotCenterDot.attr('pointer-events', 'all');
            this.rotCenterDot.style({ cursor: 'move' });
            this.attachRotationGizmoHoverHandlers();
            this.positionRotationGizmo();
        },

        // Dim every arc except `target` to 50 % opacity. Used by both the
        // hover handlers and the drag handlers so the active axis stands out
        // throughout the entire interaction (hover → click → drag).
        dimOtherRotationArcs(target: any) {
            const arcs: any[] = [this.rotRoll, this.rotPitch, this.rotYaw].filter(Boolean);
            arcs.forEach((other: any) => {
                other.attr('opacity', other === target ? 1 : 0.5);
            });
        },

        restoreRotationArcsOpacity() {
            [this.rotRoll, this.rotPitch, this.rotYaw].forEach((g: any) => {
                if (g) g.attr('opacity', 1);
            });
        },

        // Hover behaviour: when the user mouses over one arc, dim the other
        // two to 50 % opacity so it is visually obvious which axis they are
        // about to grab. Restored when the pointer leaves — but if a drag is
        // in progress the active arc keeps the others dimmed regardless of
        // pointer position.
        attachRotationGizmoHoverHandlers() {
            const arcs: any[] = [this.rotRoll, this.rotPitch, this.rotYaw].filter(Boolean);
            arcs.forEach((target: any) => {
                const onEnter = (): void => {
                    if (this.activeRotArc) return; // drag in progress owns the dim state
                    this.dimOtherRotationArcs(target);
                };
                const onLeave = (): void => {
                    if (this.activeRotArc) return; // keep the drag-driven dimming
                    this.restoreRotationArcsOpacity();
                };
                target.node.addEventListener('mouseenter', onEnter);
                target.node.addEventListener('mouseleave', onLeave);
                target.__rotGizmoHoverTeardown = (): void => {
                    target.node.removeEventListener('mouseenter', onEnter);
                    target.node.removeEventListener('mouseleave', onLeave);
                };
            });
        },

        positionRotationGizmo() {
            if (!this.rotRoll) return;
            const c = this.cuboidCentroid();
            const r = this.cuboidGizmoRadius();
            // Re-size arcs to track the cuboid's apparent size.
            // Pitch is the vertical flat ellipse, yaw is the horizontal one
            // (matches setupRotationGizmo so visuals align with behaviour).
            this.rotRoll.size(r * 2, r * 2).center(c.x, c.y);
            this.rotPitch.size((r * 2) / 3, r * 2).center(c.x, c.y);
            this.rotYaw.size(r * 2, (r * 2) / 3).center(c.x, c.y);
            if (this.rotCenterDot) {
                const dotRadius = Math.max(2, r * 0.18);
                this.rotCenterDot.size(dotRadius * 2, dotRadius * 2).center(c.x, c.y);
            }
        },

        removeRotationGizmo() {
            [this.rotRoll, this.rotPitch, this.rotYaw, this.rotCenterDot].forEach((g: any) => {
                if (g) {
                    if (typeof g.__rotGizmoHoverTeardown === 'function') {
                        g.__rotGizmoHoverTeardown();
                        g.__rotGizmoHoverTeardown = null;
                    }
                    g.remove();
                }
            });
            this.rotRoll = null;
            this.rotPitch = null;
            this.rotYaw = null;
            this.rotCenterDot = null;
        },

        attachRotationGizmoHandlers() {
            if (!this.rotRoll) return;

            const focalPx = (): number => {
                // Use the SVG viewbox dimensions (image pixel space) as a
                // reasonable focal-length proxy. Falls back to a sensible
                // constant if the viewbox isn't yet sized.
                try {
                    const root = (this.doc() as any) || this.parent();
                    const vb = root.viewbox();
                    return Math.max(vb.width || 0, vb.height || 0) || 1000;
                } catch (e) {
                    return 1000;
                }
            };

            // Centroid in screen-pixel coordinates (used only for roll's
            // tangential angle calculation; we need it before each move
            // because the SVG transform may have changed via pan/zoom).
            const centroidScreen = (): { x: number; y: number } => {
                const c = this.cuboidCentroid();
                const ctm = this.node.getScreenCTM();
                if (!ctm) return { x: 0, y: 0 };
                return {
                    x: c.x * ctm.a + c.y * ctm.c + ctm.e,
                    y: c.x * ctm.b + c.y * ctm.d + ctm.f,
                };
            };

            const wireArc = (axis: RotationAxis, el: any): void => {
                if (!el) return;
                let dragging = false;
                let last = { x: 0, y: 0 };
                // Captured once per gesture so the cuboid doesn't drift in
                // size as the rotation progresses (the per-call estimate
                // would otherwise change as the box rotates in 2D).
                let halfDepthAtStart = 0;

                const onMove = (ev: MouseEvent): void => {
                    if (!dragging) return;
                    const dx = ev.clientX - last.x;
                    const dy = ev.clientY - last.y;
                    last = { x: ev.clientX, y: ev.clientY };

                    let dTheta = 0;
                    if (axis === 'roll') {
                        const cs = centroidScreen();
                        const a1 = Math.atan2((ev.clientY - dy) - cs.y, (ev.clientX - dx) - cs.x);
                        const a2 = Math.atan2(ev.clientY - cs.y, ev.clientX - cs.x);
                        dTheta = a2 - a1;
                        // unwrap so a tiny tangential motion doesn't flip ±2π
                        if (dTheta > Math.PI) dTheta -= Math.PI * 2;
                        else if (dTheta < -Math.PI) dTheta += Math.PI * 2;
                    } else if (axis === 'pitch') {
                        // 0.5°/px (drag down = +pitch).
                        dTheta = (dy * 0.5) * (Math.PI / 180);
                    } else {
                        // yaw — drag right = +yaw.
                        dTheta = (dx * 0.5) * (Math.PI / 180);
                    }

                    if (dTheta !== 0) {
                        // Pass the gizmo's visual centroid as the pivot so the
                        // cuboid rotates around the exact spot the user grabbed.
                        // With a lens active `cuboidCentroid()` is the mean of
                        // all 12 curved-edge samples (image-pixel space), which
                        // matches the gizmo position. Without a lens it equals
                        // the 8-corner mean.
                        const pivot = this.cuboidCentroid();
                        this.cuboidModel.rotateCuboid(
                            axis,
                            dTheta,
                            focalPx(),
                            this.lens || null,
                            halfDepthAtStart,
                            pivot,
                        );
                        // updateViewAndVM refreshes faces/edges AND writes the
                        // serialised points string back onto the SVG element so
                        // readPointsFromShape() returns the rotated geometry on
                        // the eventual `resizedone` (matches the pattern used by
                        // every other cuboid handle in this file).
                        this.updateViewAndVM(false);
                        this.positionRotationGizmo();
                        this.positionFreeCornerHandles();
                        this.fire(new CustomEvent('resizing', { detail: { event: ev } }));
                    }
                };

                const onUp = (ev: MouseEvent): void => {
                    if (!dragging) return;
                    dragging = false;
                    el.style({ cursor: 'grab' });
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    // Release the drag-driven dim. If the pointer is still
                    // over an arc its hover handler will re-apply dimming.
                    this.activeRotArc = null;
                    this.restoreRotationArcsOpacity();
                    this.fire(new CustomEvent('resizedone', { detail: { event: ev } }));
                };

                const onDown = (ev: MouseEvent): void => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    dragging = true;
                    last = { x: ev.clientX, y: ev.clientY };
                    // Mark this arc as the actively-rotated one so hover
                    // mouseleave events don't restore the other arcs to full
                    // opacity while the drag is still in progress.
                    this.activeRotArc = el;
                    this.dimOtherRotationArcs(el);
                    // Snapshot the cuboid's effective depth (in image pixels)
                    // at the start of the gesture so subsequent rotation steps
                    // see a stable lift radius. We use the same front-vs-back
                    // 2D centroid distance heuristic as rotateCuboid's fallback,
                    // but freeze it for the duration of the drag.
                    const pts = this.cuboidModel.points;
                    if (pts && pts.length === 8) {
                        const meanIdx = (idxs: number[]): { x: number; y: number } => idxs.reduce(
                            (a, i) => ({
                                x: a.x + pts[i].x / idxs.length,
                                y: a.y + pts[i].y / idxs.length,
                            }),
                            { x: 0, y: 0 },
                        );
                        const f = meanIdx([0, 1, 2, 3]);
                        const b = meanIdx([4, 5, 6, 7]);
                        halfDepthAtStart = (Math.hypot(b.x - f.x, b.y - f.y) || 1) / 2;
                    } else {
                        halfDepthAtStart = 0;
                    }
                    el.style({ cursor: 'grabbing' });
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                    this.fire(new CustomEvent('resizestart', { detail: { event: ev } }));
                };

                el.node.addEventListener('mousedown', onDown);
                // Stash for later teardown.
                el.__rotGizmoTeardown = (): void => {
                    el.node.removeEventListener('mousedown', onDown);
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                };
            };

            wireArc('roll', this.rotRoll);
            wireArc('pitch', this.rotPitch);
            wireArc('yaw', this.rotYaw);

            // Centroid translation dot. Mimics the behaviour of dragging the
            // front face: moves all 8 cuboid corners by the cursor delta in
            // image-pixel space, leaving the perspective untouched.
            if (this.rotCenterDot) {
                const dot = this.rotCenterDot;
                let dragging = false;
                let last = { x: 0, y: 0 };

                // Convert a clientX/clientY to image-space (SVG user units)
                // using the inverse screen CTM. This keeps translation in
                // sync with the cuboid regardless of pan/zoom.
                const toImage = (cx: number, cy: number): { x: number; y: number } => {
                    const ctm = this.node.getScreenCTM();
                    if (!ctm) return { x: cx, y: cy };
                    const inv = ctm.inverse();
                    return {
                        x: cx * inv.a + cy * inv.c + inv.e,
                        y: cx * inv.b + cy * inv.d + inv.f,
                    };
                };

                const onMove = (ev: MouseEvent): void => {
                    if (!dragging) return;
                    const cur = toImage(ev.clientX, ev.clientY);
                    const dx = cur.x - last.x;
                    const dy = cur.y - last.y;
                    last = cur;
                    if (dx !== 0 || dy !== 0) {
                        this.dmove(dx, dy);
                        this.positionRotationGizmo();
                        this.positionFreeCornerHandles();
                        this.fire(new CustomEvent('dragmove', { detail: { event: ev } }));
                    }
                };

                const onUp = (ev: MouseEvent): void => {
                    if (!dragging) return;
                    dragging = false;
                    dot.style({ cursor: 'move' });
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    // Mirror the rotation gesture's dim/restore lifecycle so
                    // the arcs return to full opacity once translation ends.
                    this.activeRotArc = null;
                    this.restoreRotationArcsOpacity();
                    this.fire(new CustomEvent('dragend', { detail: { event: ev } }));
                };

                const onDown = (ev: MouseEvent): void => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    dragging = true;
                    last = toImage(ev.clientX, ev.clientY);
                    dot.style({ cursor: 'grabbing' });
                    // Dim all three arcs to 50 % so the gizmo visually
                    // signals "translation in progress". Passing the dot as
                    // the target dims everything except the dot itself; the
                    // activeRotArc flag suppresses hover-driven restoration.
                    this.activeRotArc = dot;
                    this.dimOtherRotationArcs(dot);
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                    this.fire(new CustomEvent('dragstart', { detail: { event: ev } }));
                };

                dot.node.addEventListener('mousedown', onDown);
                dot.__rotGizmoTeardown = (): void => {
                    dot.node.removeEventListener('mousedown', onDown);
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                };
            }
        },

        detachRotationGizmoHandlers() {
            [this.rotRoll, this.rotPitch, this.rotYaw, this.rotCenterDot].forEach((g: any) => {
                if (g && typeof g.__rotGizmoTeardown === 'function') {
                    g.__rotGizmoTeardown();
                    g.__rotGizmoTeardown = null;
                }
            });
        },

        showProjections() {
            if (this.projectionLineEnable) {
                this.ftProj.show();
                this.fbProj.show();
                this.rtProj.show();
                this.rbProj.show();
            }
        },

        hideProjections() {
            this.ftProj.hide();
            this.fbProj.hide();
            this.rtProj.hide();
            this.rbProj.hide();
        },

        getEdges() {
            const arr = [];
            arr.push(this.frontLeftEdge);
            arr.push(this.frontRightEdge);
            arr.push(this.dorsalRightEdge);
            arr.push(this.frontTopEdge);
            arr.push(this.frontBotEdge);
            arr.push(this.dorsalLeftEdge);
            arr.push(this.rightTopEdge);
            arr.push(this.rightBotEdge);
            return arr;
        },

        getGrabPoints() {
            const arr = [];
            arr.push(this.flCenter);
            arr.push(this.frCenter);
            arr.push(this.drCenter);
            arr.push(this.ftCenter);
            arr.push(this.fbCenter);
            arr.push(this.dlCenter);
            return arr;
        },

        updateProjectionLine(equation: Equation, source: Point, direction: Point) {
            const x1 = source.x;
            const y1 = equation.getY(x1);

            const x2 = direction.x;
            const y2 = equation.getY(x2);
            return [
                [x1, y1],
                [x2, y2],
            ];
        },

        selectize(value: boolean, options: object) {
            this.face.selectize(value, options);

            if (this.cuboidModel.orientation === Orientation.LEFT) {
                this.dorsalLeftEdge.selectize(false, options);
                this.dorsalRightEdge.selectize(value, options);
            } else {
                this.dorsalRightEdge.selectize(false, options);
                this.dorsalLeftEdge.selectize(value, options);
            }

            if (value === false) {
                this.getGrabPoints().forEach((point: SVG.Element) => {
                    point && point.remove();
                });
                [
                    this.bltCenter, this.blbCenter, this.brtCenter, this.brbCenter,
                    this.fltCenter, this.flbCenter, this.frtCenter, this.frbCenter,
                ].forEach((point: SVG.Element) => {
                    if (point) point.remove();
                });
                this.bltCenter = null;
                this.blbCenter = null;
                this.brtCenter = null;
                this.brbCenter = null;
                this.fltCenter = null;
                this.flbCenter = null;
                this.frtCenter = null;
                this.frbCenter = null;
                // Tear down the rotation gizmo (INT-5976).
                this.detachRotationGizmoHandlers();
                this.removeRotationGizmo();
            } else {
                this.setupGrabPoints(
                    this.face
                        .remember('_selectHandler')
                        .drawPoint.bind({ nested: this, options: this.face.remember('_selectHandler').options }),
                );

                // setup proper classes for selection points for proper cursor
                Array.from(this.face.remember('_selectHandler').nested.node.children).forEach(
                    (point: SVG.LinkedHTMLElement, i: number) => {
                        point.classList.add(`svg_select_points_${['lt', 'lb', 'rb', 'rt'][i]}`);
                    },
                );

                if (this.cuboidModel.orientation === Orientation.LEFT) {
                    Array.from(this.dorsalRightEdge.remember('_selectHandler').nested.node.children).forEach(
                        (point: SVG.LinkedHTMLElement, i: number) => {
                            point.classList.add(`svg_select_points_${['t', 'b'][i]}`);
                            point.ondblclick = (e: MouseEvent) => {
                                if (e.shiftKey) {
                                    this.resetPerspective();
                                }
                            };
                        },
                    );
                } else {
                    Array.from(this.dorsalLeftEdge.remember('_selectHandler').nested.node.children).forEach(
                        (point: SVG.LinkedHTMLElement, i: number) => {
                            point.classList.add(`svg_select_points_${['t', 'b'][i]}`);
                            point.ondblclick = (e: MouseEvent) => {
                                if (e.shiftKey) {
                                    this.resetPerspective();
                                }
                            };
                        },
                    );
                }
            }

            return this;
        },

        resize(value?: string | object) {
            this.face.resize(value);

            if (value === 'stop') {
                this.dorsalRightEdge.resize(value);
                this.dorsalLeftEdge.resize(value);
                this.face.off('resizing').off('resizedone').off('resizestart');
                this.dorsalRightEdge.off('resizing').off('resizedone').off('resizestart');
                this.dorsalLeftEdge.off('resizing').off('resizedone').off('resizestart');

                this.getGrabPoints().forEach((point: SVG.Element) => {
                    if (point) {
                        point.off('dragstart');
                        point.off('dragmove');
                        point.off('dragend');
                    }
                });

                // Clean per-corner handle listeners (front + back) as well.
                [
                    this.bltCenter, this.blbCenter, this.brtCenter, this.brbCenter,
                    this.fltCenter, this.flbCenter, this.frtCenter, this.frbCenter,
                ].forEach((point: SVG.Element) => {
                    if (point) {
                        point.off('dragstart');
                        point.off('dragmove');
                        point.off('dragend');
                    }
                });

                // Detach rotation gizmo (INT-5976) listeners.
                this.detachRotationGizmoHandlers();

                return;
            }

            function getResizedPointIndex(event: CustomEvent): number {
                const { target } = event.detail.event.detail.event;
                const { parentElement } = target;
                return Array.from(parentElement.children).indexOf(target);
            }

            let resizedCubePoint: null | number = null;
            const accumulatedOffset: Point = {
                x: 0,
                y: 0,
            };

            this.face
                .on('resizestart', (event: CustomEvent) => {
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;
                    const resizedFacePoint = getResizedPointIndex(event);
                    resizedCubePoint = [0, 1].includes(resizedFacePoint) ? resizedFacePoint : 5 - resizedFacePoint; // 2,3 -> 3,2
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('resizing', (event: CustomEvent) => {
                    let { dx, dy } = event.detail;
                    let dxPortion = dx - accumulatedOffset.x;
                    let dyPortion = dy - accumulatedOffset.y;
                    accumulatedOffset.x += dxPortion;
                    accumulatedOffset.y += dyPortion;

                    // ── FREE-FACE PATH ──────────────────────────────────
                    // When free-face mode is on, dragging a single front-face
                    // corner must move only that corner. Skip all perspective
                    // recomputation that normally enforces vertical FL/FR.
                    if (this.cuboidModel.freeFaceMode) {
                        const pts = this.cuboidModel.points;
                        pts[resizedCubePoint] = {
                            x: pts[resizedCubePoint].x + dxPortion,
                            y: pts[resizedCubePoint].y + dyPortion,
                        };
                        this.updateViewAndVM(false);
                        this.face.plot(this.cuboidModel.front.points);
                        this.fire(new CustomEvent('resizing', event));
                        return;
                    }

                    const edge = getEdgeIndex(resizedCubePoint);
                    const [edgeTopIndex, edgeBottomIndex] = getTopDown(edge);

                    let cuboidPoints = this.cuboidModel.getPoints();
                    let x1 = cuboidPoints[edgeTopIndex].x + dxPortion;
                    let x2 = cuboidPoints[edgeBottomIndex].x + dxPortion;
                    if (
                        edge === EdgeIndex.FL &&
                        cuboidPoints[2].x - (cuboidPoints[0].x + dxPortion) < consts.MIN_EDGE_LENGTH
                    ) {
                        x1 = cuboidPoints[edgeTopIndex].x;
                        x2 = cuboidPoints[edgeBottomIndex].x;
                    } else if (
                        edge === EdgeIndex.FR &&
                        cuboidPoints[2].x + dxPortion - cuboidPoints[0].x < consts.MIN_EDGE_LENGTH
                    ) {
                        x1 = cuboidPoints[edgeTopIndex].x;
                        x2 = cuboidPoints[edgeBottomIndex].x;
                    }
                    const y1 = this.cuboidModel.ft.getEquation().getY(x1);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x2);
                    const topPoint = { x: x1, y: y1 };
                    const botPoint = { x: x2, y: y2 };
                    if (edge === 1) {
                        this.cuboidModel.fl.points = [topPoint, botPoint];
                    } else {
                        this.cuboidModel.fr.points = [topPoint, botPoint];
                    }
                    this.updateViewAndVM(edge === EdgeIndex.FR);

                    cuboidPoints = this.cuboidModel.getPoints();
                    const midPointUp = { ...cuboidPoints[edgeTopIndex] };
                    const midPointDown = { ...cuboidPoints[edgeBottomIndex] };
                    (edgeTopIndex === resizedCubePoint ? midPointUp : midPointDown).y += dyPortion;
                    if (midPointDown.y - midPointUp.y > consts.MIN_EDGE_LENGTH) {
                        const topPoints = this.computeHeightFace(midPointUp, edge);
                        const bottomPoints = this.computeHeightFace(midPointDown, edge);
                        this.cuboidModel.top.points = topPoints;
                        this.cuboidModel.bot.points = bottomPoints;
                        this.updateViewAndVM(false);
                    }

                    this.face.plot(this.cuboidModel.front.points);
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('resizedone', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            function computeSideEdgeConstraints(edge: Edge, fr: Edge) {
                const midLength = fr.points[1].y - fr.points[0].y - 1;

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

            function setupDorsalEdge(edge: SVG.Line, orientation: Orientation) {
                edge.on('resizestart', (event: CustomEvent) => {
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;
                    resizedCubePoint = getResizedPointIndex(event) + (orientation === Orientation.LEFT ? 4 : 6);
                    this.fire(new CustomEvent('resizestart', event));
                })
                    .on('resizing', (event: CustomEvent) => {
                        let { dy } = event.detail;
                        let dyPortion = dy - accumulatedOffset.y;
                        accumulatedOffset.y += dyPortion;

                        const edge = getEdgeIndex(resizedCubePoint);
                        const [edgeTopIndex, edgeBottomIndex] = getTopDown(edge);
                        let cuboidPoints = this.cuboidModel.getPoints();

                        if (!event.detail.event.shiftKey) {
                            cuboidPoints = this.cuboidModel.getPoints();
                            const midPointUp = { ...cuboidPoints[edgeTopIndex] };
                            const midPointDown = { ...cuboidPoints[edgeBottomIndex] };
                            (edgeTopIndex === resizedCubePoint ? midPointUp : midPointDown).y += dyPortion;
                            if (midPointDown.y - midPointUp.y > consts.MIN_EDGE_LENGTH) {
                                const topPoints = this.computeHeightFace(midPointUp, edge);
                                const bottomPoints = this.computeHeightFace(midPointDown, edge);
                                this.cuboidModel.top.points = topPoints;
                                this.cuboidModel.bot.points = bottomPoints;
                            }
                        } else {
                            const midPointUp = { ...cuboidPoints[edgeTopIndex] };
                            const midPointDown = { ...cuboidPoints[edgeBottomIndex] };
                            (edgeTopIndex === resizedCubePoint ? midPointUp : midPointDown).y += dyPortion;
                            const dorselEdge =
                                orientation === Orientation.LEFT ? this.cuboidModel.dr : this.cuboidModel.dl;
                            const constraints = computeSideEdgeConstraints(dorselEdge, this.cuboidModel.fr);
                            midPointUp.y = clamp(midPointUp.y, constraints.y1Range.min, constraints.y1Range.max);
                            midPointDown.y = clamp(midPointDown.y, constraints.y2Range.min, constraints.y2Range.max);
                            dorselEdge.points = [midPointUp, midPointDown];
                            this.updateViewAndVM(edge === EdgeIndex.DL);
                        }

                        this.updateViewAndVM(false);
                        this.face.plot(this.cuboidModel.front.points);
                        this.fire(new CustomEvent('resizing', event));
                    })
                    .on('resizedone', (event: CustomEvent) => {
                        this.fire(new CustomEvent('resizedone', event));
                    });
            }

            if (this.cuboidModel.orientation === Orientation.LEFT) {
                this.dorsalRightEdge.resize(value);
                setupDorsalEdge.call(this, this.dorsalRightEdge, this.cuboidModel.orientation);
            } else {
                this.dorsalLeftEdge.resize(value);
                setupDorsalEdge.call(this, this.dorsalLeftEdge, this.cuboidModel.orientation);
            }

            function horizontalEdgeControl(updatingFace: any, midX: number, midY: number) {
                const leftPoints = this.updatedEdge(
                    this.cuboidModel.fl.points[0],
                    { x: midX, y: midY },
                    this.cuboidModel.vpl,
                );
                const rightPoints = this.updatedEdge(
                    this.cuboidModel.dr.points[0],
                    { x: midX, y: midY },
                    this.cuboidModel.vpr,
                );

                updatingFace.points = [leftPoints, { x: midX, y: midY }, rightPoints, null];
            }

            this.drCenter
                .draggable((x: number) => {
                    let xStatus;
                    if (this.drCenter.cx() < this.cuboidModel.fr.points[0].x) {
                        xStatus =
                            x < this.cuboidModel.fr.points[0].x - consts.MIN_EDGE_LENGTH &&
                            x > this.cuboidModel.vpr.x + consts.MIN_EDGE_LENGTH;
                    } else {
                        xStatus =
                            x > this.cuboidModel.fr.points[0].x + consts.MIN_EDGE_LENGTH &&
                            x < this.cuboidModel.vpr.x - consts.MIN_EDGE_LENGTH;
                    }
                    return { x: xStatus, y: this.drCenter.attr('y1') };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.dorsalRightEdge.center(this.drCenter.cx(), this.drCenter.cy());

                    const x = this.dorsalRightEdge.attr('x1');
                    const y1 = this.cuboidModel.rt.getEquation().getY(x);
                    const y2 = this.cuboidModel.rb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.dr.points = [topPoint, botPoint];
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.dlCenter
                .draggable((x: number) => {
                    let xStatus;
                    if (this.dlCenter.cx() < this.cuboidModel.fl.points[0].x) {
                        xStatus =
                            x < this.cuboidModel.fl.points[0].x - consts.MIN_EDGE_LENGTH &&
                            x > this.cuboidModel.vpr.x + consts.MIN_EDGE_LENGTH;
                    } else {
                        xStatus =
                            x > this.cuboidModel.fl.points[0].x + consts.MIN_EDGE_LENGTH &&
                            x < this.cuboidModel.vpr.x - consts.MIN_EDGE_LENGTH;
                    }
                    return { x: xStatus, y: this.dlCenter.attr('y1') };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.dorsalLeftEdge.center(this.dlCenter.cx(), this.dlCenter.cy());

                    const x = this.dorsalLeftEdge.attr('x1');
                    const y1 = this.cuboidModel.lt.getEquation().getY(x);
                    const y2 = this.cuboidModel.lb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.dl.points = [topPoint, botPoint];
                    this.updateViewAndVM(true);
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.flCenter
                .draggable((x: number) => {
                    const vpX = this.flCenter.cx() - this.cuboidModel.vpl.x > 0 ? this.cuboidModel.vpl.x : 0;
                    return { x: x < this.cuboidModel.fr.points[0].x && x > vpX + consts.MIN_EDGE_LENGTH };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontLeftEdge.center(this.flCenter.cx(), this.flCenter.cy());

                    const x = this.frontLeftEdge.attr('x1');
                    const y1 = this.cuboidModel.ft.getEquation().getY(x);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.fl.points = [topPoint, botPoint];
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.frCenter
                .draggable((x: number) => {
                    return { x: x > this.cuboidModel.fl.points[0].x, y: this.frCenter.attr('y1') };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontRightEdge.center(this.frCenter.cx(), this.frCenter.cy());

                    const x = this.frontRightEdge.attr('x1');
                    const y1 = this.cuboidModel.ft.getEquation().getY(x);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.fr.points = [topPoint, botPoint];
                    this.updateViewAndVM(true);
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.ftCenter
                .draggable((x: number, y: number) => {
                    return { x: x === this.ftCenter.cx(), y: y < this.fbCenter.cy() - consts.MIN_EDGE_LENGTH };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontTopEdge.center(this.ftCenter.cx(), this.ftCenter.cy());
                    horizontalEdgeControl.call(
                        this,
                        this.cuboidModel.top,
                        this.frontTopEdge.attr('x2'),
                        this.frontTopEdge.attr('y2'),
                    );
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.fbCenter
                .draggable((x: number, y: number) => {
                    return { x: x === this.fbCenter.cx(), y: y > this.ftCenter.cy() + consts.MIN_EDGE_LENGTH };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontBotEdge.center(this.fbCenter.cx(), this.fbCenter.cy());
                    horizontalEdgeControl.call(
                        this,
                        this.cuboidModel.bot,
                        this.frontBotEdge.attr('x2'),
                        this.frontBotEdge.attr('y2'),
                    );
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            // Per-corner handles (front + back). Active only when freeFaceMode
            // is on. Each handle drags its own cuboid point with no perspective
            // constraint; other corners are unaffected.
            const setupFreeCornerHandle = (handle: any, pointIndex: number): void => {
                if (!handle) return;
                handle
                    .draggable(() => ({
                        // Allow free 2D motion while in free-face mode;
                        // when not in that mode, lock the handle in place.
                        x: !!this.cuboidModel.freeFaceMode,
                        y: !!this.cuboidModel.freeFaceMode,
                    }))
                    .on('dragstart', (event: CustomEvent) => {
                        this.fire(new CustomEvent('resizestart', event));
                    })
                    .on('dragmove', (event: CustomEvent) => {
                        if (!this.cuboidModel.freeFaceMode) return;
                        const cx = handle.cx();
                        const cy = handle.cy();
                        this.cuboidModel.points[pointIndex] = { x: cx, y: cy };
                        this.updateViewAndVM(false);
                        this.fire(new CustomEvent('resizing', event));
                    })
                    .on('dragend', (event: CustomEvent) => {
                        this.fire(new CustomEvent('resizedone', event));
                    });
            };

            // Back face: blt=6, blb=7, brt=4, brb=5
            setupFreeCornerHandle(this.bltCenter, 6);
            setupFreeCornerHandle(this.blbCenter, 7);
            setupFreeCornerHandle(this.brtCenter, 4);
            setupFreeCornerHandle(this.brbCenter, 5);
            // Front face: flt=0, flb=1, frt=2, frb=3
            setupFreeCornerHandle(this.fltCenter, 0);
            setupFreeCornerHandle(this.flbCenter, 1);
            setupFreeCornerHandle(this.frtCenter, 2);
            setupFreeCornerHandle(this.frbCenter, 3);

            // Rotation gizmo (INT-5976) listeners. The SVG elements were
            // created in setupGrabPoints; here we hook up mouse events.
            this.attachRotationGizmoHandlers();

            return this;
        },

        draggable(value: any, constraint: any) {
            const { cuboidModel } = this;
            const faces = [this.face, this.right, this.dorsal, this.left];
            const accumulatedOffset: Point = {
                x: 0,
                y: 0,
            };

            if (value === false) {
                faces.forEach((face: any) => {
                    face.draggable(false);
                    face.off('dragstart');
                    face.off('dragmove');
                    face.off('dragend');
                });
                return;
            }

            this.face
                .draggable()
                .on('dragstart', (event: CustomEvent) => {
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;

                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    const dx = event.detail.p.x - event.detail.handler.startPoints.point.x;
                    const dy = event.detail.p.y - event.detail.handler.startPoints.point.y;
                    let dxPortion = dx - accumulatedOffset.x;
                    let dyPortion = dy - accumulatedOffset.y;
                    accumulatedOffset.x += dxPortion;
                    accumulatedOffset.y += dyPortion;

                    this.dmove(dxPortion, dyPortion);

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            this.left
                .draggable((x: number, y: number) => ({
                    x: x < Math.min(cuboidModel.dr.points[0].x, cuboidModel.fr.points[0].x) - consts.MIN_EDGE_LENGTH,
                    y,
                }))
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.cuboidModel.left.points = parsePoints(this.left.attr('points'));
                    this.updateViewAndVM();

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            this.dorsal
                .draggable()
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.cuboidModel.dorsal.points = parsePoints(this.dorsal.attr('points'));
                    this.updateViewAndVM();

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            this.right
                .draggable((x: number, y: number) => ({
                    x: x > Math.min(cuboidModel.dl.points[0].x, cuboidModel.fl.points[0].x) + consts.MIN_EDGE_LENGTH,
                    y,
                }))
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.cuboidModel.right.points = parsePoints(this.right.attr('points'));
                    this.updateViewAndVM(true);

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            return this;
        },

        _attr: SVG.Element.prototype.attr,

        attr(a: any, v: any, n: any) {
            if ((a === 'fill' || a === 'stroke' || a === 'face-stroke') && v !== undefined) {
                this._attr(a, v, n);
                this.paintOrientationLines();
            } else if (a === 'points' && typeof v === 'string') {
                const points = parsePoints(v);
                this.cuboidModel.setPoints(points);
                this.updateViewAndVM();
            } else if (a === 'projections') {
                this._attr(a, v, n);
                if (v === true) {
                    this.ftProj.show();
                    this.fbProj.show();
                    this.rtProj.show();
                    this.rbProj.show();
                } else {
                    this.ftProj.hide();
                    this.fbProj.hide();
                    this.rtProj.hide();
                    this.rbProj.hide();
                }
            } else if (a === 'stroke-width' && typeof v === 'number') {
                this._attr(a, v, n);
                this.updateThickness();
            } else if (a === 'data-z-order' && typeof v !== 'undefined') {
                this._attr(a, v, n);
                [this.face, this.left, this.dorsal, this.right, ...this.getEdges(), ...this.getGrabPoints()].forEach(
                    (el) => {
                        if (el) el.attr(a, v, n);
                    },
                );
            } else {
                return this._attr(a, v, n);
            }

            return this;
        },

        updateThickness() {
            const edges = [this.frontLeftEdge, this.frontRightEdge, this.frontTopEdge, this.frontBotEdge];
            const width = this.attr('stroke-width');
            edges.forEach((edge: SVG.Element) => {
                edge.attr('stroke-width', width * (this.strokeOffset || consts.CUBOID_UNACTIVE_EDGE_STROKE_WIDTH));
            });
            this.on('mouseover', () => {
                edges.forEach((edge: SVG.Element) => {
                    this.strokeOffset = this.node.classList.contains('cvat_canvas_shape_activated')
                        ? consts.CUBOID_ACTIVE_EDGE_STROKE_WIDTH
                        : consts.CUBOID_UNACTIVE_EDGE_STROKE_WIDTH;
                    edge.attr('stroke-width', width * this.strokeOffset);
                });
            }).on('mouseout', () => {
                edges.forEach((edge: SVG.Element) => {
                    this.strokeOffset = consts.CUBOID_UNACTIVE_EDGE_STROKE_WIDTH;
                    edge.attr('stroke-width', width * this.strokeOffset);
                });
            });
        },

        paintOrientationLines() {
            // style has higher priority than attr, so then try to fetch it if exists
            // https://stackoverflow.com/questions/47088409/svg-attributes-beaten-by-cssstyle-in-priority]
            // we use getComputedStyle to get actual, not-inlined css property (come from the corresponding css class)
            const computedStyles = getComputedStyle(this.node);
            const fillColor = computedStyles['fill'] || this.attr('fill');
            const strokeColor = computedStyles['stroke'] || this.attr('stroke');
            const selectedColor = this.attr('face-stroke') || '#b0bec5';
            this.frontTopEdge.stroke({ color: selectedColor });
            this.frontLeftEdge.stroke({ color: selectedColor });
            this.frontBotEdge.stroke({ color: selectedColor });
            this.frontRightEdge.stroke({ color: selectedColor });

            // Mirror the orientation colouring on the curved lens overlay so
            // the perspective face is still highlighted when fisheye distortion
            // is active (the original straight front edges are hidden via CSS
            // when the cuboid has the cvat_canvas_cuboid_lens_distorted class).
            // Also fill the curved front face with the grey colour at low
            // opacity, mirroring the way the rest of the cuboid is drawn in
            // its instance/label colour.
            if (this.lens) {
                this.lensEdgeFT.stroke({ color: selectedColor });
                this.lensEdgeFL.stroke({ color: selectedColor });
                this.lensEdgeFB.stroke({ color: selectedColor });
                this.lensEdgeFR.stroke({ color: selectedColor });
                this.lensFaceFront.fill({ color: selectedColor, opacity: 0.5 });
            }

            this.rightTopEdge.stroke({ color: strokeColor });
            this.rightBotEdge.stroke({ color: strokeColor });
            this.dorsalRightEdge.stroke({ color: strokeColor });
            this.dorsalLeftEdge.stroke({ color: strokeColor });

            this.bot.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.top.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.face.stroke({ color: strokeColor, width: 0 }).fill({ color: fillColor });
            this.right.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.dorsal.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.left.stroke({ color: strokeColor }).fill({ color: fillColor });
        },

        dmove(dx: number, dy: number) {
            this.cuboidModel.points.forEach((point: Point) => {
                point.x += dx;
                point.y += dy;
            });

            this.updateViewAndVM();
        },

        x(x?: number) {
            if (typeof x === 'number') {
                const { x: xInitial } = this.bbox();
                this.dmove(x - xInitial, 0);
                return this;
            } else {
                return this.bbox().x;
            }
        },

        y(y?: number) {
            if (typeof y === 'number') {
                const { y: yInitial } = this.bbox();
                this.dmove(0, y - yInitial);
                return this;
            } else {
                return this.bbox().y;
            }
        },

        resetPerspective() {
            if (this.cuboidModel.orientation === Orientation.LEFT) {
                const edgePoints = this.cuboidModel.dl.points;
                const constraints = this.cuboidModel.computeSideEdgeConstraints(this.cuboidModel.dl);
                edgePoints[0].y = constraints.y1Range.min;
                this.cuboidModel.dl.points = [edgePoints[0], edgePoints[1]];
                this.updateViewAndVM(true);
            } else {
                const edgePoints = this.cuboidModel.dr.points;
                const constraints = this.cuboidModel.computeSideEdgeConstraints(this.cuboidModel.dr);
                edgePoints[0].y = constraints.y1Range.min;
                this.cuboidModel.dr.points = [edgePoints[0], edgePoints[1]];
                this.updateViewAndVM();
            }
        },

        updateViewAndVM(build: boolean) {
            this.cuboidModel.updateOrientation();
            if (!this.cuboidModel.freeFaceMode) {
                this.cuboidModel.buildBackEdge(build);
            } else {
                // Refresh vanishing points from current geometry purely so the
                // projection guides (ftProj/fbProj/rtProj/rbProj) stay sane if
                // the user toggles back to standard mode. Do NOT rewrite the
                // face points: they are user-controlled in free-face mode.
                (this.cuboidModel as any).updateVanishingPoints(false);
            }
            this.updateView();

            // to correct getting of points in resizedone, dragdone
            this._attr(
                'points',
                this.cuboidModel
                    .getPoints()
                    .reduce((acc: string, point: Point): string => `${acc} ${point.x},${point.y}`, '')
                    .trim(),
            );
        },

        // Toggle Free Face Mode for this cuboid.
        // When enabled, all 8 corner points (indices 0..7) become individually
        // draggable and no side edge is forced vertical. When disabled, the
        // front face is re-verticalised and the back face is rebuilt from the
        // perspective rays so the cuboid is once again perspective-consistent.
        setFreeFaceMode(flag: boolean) {
            this.cuboidModel.freeFaceMode = !!flag;
            if (!flag) {
                // Snap side edges back to vertical and rebuild the back face
                // along the perspective rays.
                this.cuboidModel.updatePoints();
                this.cuboidModel.buildBackEdge(false);
                this.showProjections();
            } else {
                // Hide the vanishing-point projection guides while in free
                // mode — they're meaningless without perspective coupling.
                this.hideProjections();
            }
            this.updateFreeCornerHandlesVisibility();
            this.updateView();
            this._attr(
                'points',
                this.cuboidModel
                    .getPoints()
                    .reduce((acc: string, point: Point): string => `${acc} ${point.x},${point.y}`, '')
                    .trim(),
            );
            // Notify CVAT so the change is persisted via the resize event chain.
            this.fire(new CustomEvent('resizedone', { detail: {} }));
        },

        isFreeFaceMode(): boolean {
            return !!(this.cuboidModel && this.cuboidModel.freeFaceMode);
        },

        // Zero pitch / roll / yaw by re-anchoring the cuboid to its current
        // 2D bounding rectangle as a perspective-valid box. INT-5976.
        resetCuboidRotation() {
            const pts = this.cuboidModel.points;
            if (!pts || pts.length !== 8) return;
            const xs = pts.map((p: Point) => p.x);
            const ys = pts.map((p: Point) => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const w = Math.max(maxX - minX, 4);
            // Synthesised dorsal-offset depth: 25 % of width, capped to keep
            // the front face the dominant face on small cuboids.
            const d = Math.max(Math.min(w * 0.25, w - 4), 1);
            // Rebuild as a right-orientation cuboid (front face on the left).
            pts[0] = { x: minX, y: minY }; // flt
            pts[1] = { x: minX, y: maxY }; // flb
            pts[2] = { x: minX + (w - d), y: minY }; // frt
            pts[3] = { x: minX + (w - d), y: maxY }; // frb
            pts[4] = { x: maxX, y: minY - d * 0.2 }; // brt
            pts[5] = { x: maxX, y: maxY + d * 0.2 }; // brb
            pts[6] = { x: minX + d, y: minY - d * 0.2 }; // blt
            pts[7] = { x: minX + d, y: maxY + d * 0.2 }; // blb
            // Snap back to standard perspective mode: re-verticalise side
            // edges and rebuild the back face along the perspective rays.
            this.cuboidModel.freeFaceMode = false;
            this.cuboidModel.updateOrientation();
            this.cuboidModel.updatePoints();
            this.cuboidModel.buildBackEdge(false);
            this.updateFreeCornerHandlesVisibility();
            this.showProjections();
            this.updateView();
            this.positionRotationGizmo();
            this._attr(
                'points',
                this.cuboidModel
                    .getPoints()
                    .reduce((acc: string, point: Point): string => `${acc} ${point.x},${point.y}`, '')
                    .trim(),
            );
            // Notify CVAT so the change is persisted via the resize chain.
            this.fire(new CustomEvent('resizedone', { detail: {} }));
        },

        updateFreeCornerHandlesVisibility() {
            const handles = [
                this.bltCenter, this.blbCenter, this.brtCenter, this.brbCenter,
                this.fltCenter, this.flbCenter, this.frtCenter, this.frbCenter,
            ];
            const show = !!(this.cuboidModel && this.cuboidModel.freeFaceMode);
            handles.forEach((h: any) => {
                if (h) {
                    if (show) h.show();
                    else h.hide();
                }
            });
        },

        computeHeightFace(point: Point, index: number) {
            switch (index) {
                // fl
                case 1: {
                    const p2 = this.updatedEdge(this.cuboidModel.fr.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.dr.points[0], p2, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.dl.points[0], point, this.cuboidModel.vpr);
                    return [point, p2, p3, p4];
                }
                // fr
                case 2: {
                    const p1 = this.updatedEdge(this.cuboidModel.fl.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.dr.points[0], point, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.dl.points[0], p3, this.cuboidModel.vpr);
                    return [p1, point, p3, p4];
                }
                // dr
                case 3: {
                    const p2 = this.updatedEdge(this.cuboidModel.dl.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.fr.points[0], point, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.fl.points[0], p2, this.cuboidModel.vpr);
                    return [p4, p3, point, p2];
                }
                // dl
                case 4: {
                    const p2 = this.updatedEdge(this.cuboidModel.dr.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.fl.points[0], point, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.fr.points[0], p2, this.cuboidModel.vpr);
                    return [p3, p4, p2, point];
                }
                default: {
                    return [null, null, null, null];
                }
            }
        },

        updatedEdge(target: Point, base: Point, pivot: Point) {
            const targetX = target.x;
            const line = new Equation(pivot, base);
            const newY = line.getY(targetX);
            return { x: targetX, y: newY };
        },

        updateView() {
            this.updateFaces();
            this.updateEdges();
            this.updateProjections();
            this.updateGrabPoints();
            if (this.lens) {
                this.updateLensOverlay();
            }
        },

        updateFaces() {
            const viewModel = this.cuboidModel;

            this.bot.plot(viewModel.bot.points);
            this.top.plot(viewModel.top.points);
            this.right.plot(viewModel.right.points);
            this.dorsal.plot(viewModel.dorsal.points);
            this.left.plot(viewModel.left.points);
            this.face.plot(viewModel.front.points);
        },

        updateEdges() {
            const viewModel = this.cuboidModel;

            this.frontLeftEdge.plot(viewModel.fl.points);
            this.frontRightEdge.plot(viewModel.fr.points);
            this.dorsalRightEdge.plot(viewModel.dr.points);
            this.dorsalLeftEdge.plot(viewModel.dl.points);

            this.frontTopEdge.plot(viewModel.ft.points);
            this.rightTopEdge.plot(viewModel.rt.points);
            this.frontBotEdge.plot(viewModel.fb.points);
            this.rightBotEdge.plot(viewModel.rb.points);
        },

        updateProjections() {
            const viewModel = this.cuboidModel;

            this.ftProj.plot(
                this.updateProjectionLine(viewModel.ft.getEquation(), viewModel.ft.points[0], viewModel.vpl),
            );
            this.fbProj.plot(
                this.updateProjectionLine(viewModel.fb.getEquation(), viewModel.ft.points[0], viewModel.vpl),
            );
            this.rtProj.plot(
                this.updateProjectionLine(viewModel.rt.getEquation(), viewModel.rt.points[1], viewModel.vpr),
            );
            this.rbProj.plot(
                this.updateProjectionLine(viewModel.rb.getEquation(), viewModel.rt.points[1], viewModel.vpr),
            );
        },

        updateGrabPoints() {
            const centers = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < centers.length; i += 1) {
                const edge = edges[i];
                if (centers[i] && edge) centers[i].center(edge.cx(), edge.cy());
            }
            // Per-corner handles follow their own (corner) coordinates.
            this.positionFreeCornerHandles();
            // Rotation gizmo (INT-5976) follows the cuboid centroid.
            this.positionRotationGizmo();
        },
    },
    construct: {
        cube(points: string, opts?: { lens?: FisheyeParams | null; offset?: number }) {
            return this.put(new (SVG as any).Cube()).constructorMethod(points, opts);
        },
    },
});
