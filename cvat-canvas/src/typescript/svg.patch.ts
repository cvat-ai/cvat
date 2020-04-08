// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */
import * as SVG from 'svg.js';
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

// Update constructor
const originalDraw = SVG.Element.prototype.draw;
SVG.Element.prototype.draw = function constructor(...args: any): any {
    let handler = this.remember('_paintHandler');
    if (!handler) {
        originalDraw.call(this, ...args);
        handler = this.remember('_paintHandler');
        if (!handler.set) {
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

// Create undo for polygones and polylines
function undo(): void {
    if (this.set && this.set.length()) {
        this.set.members.splice(-1, 1)[0].remove();
        this.el.array().value.splice(-2, 1);
        this.el.plot(this.el.array());
        this.el.fire('undopoint');
    }
}

SVG.Element.prototype.draw.extend('polyline', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    {
        undo: undo,
    },
));

SVG.Element.prototype.draw.extend('polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polygon,
    {
        undo: undo,
    },
));


// Create transform for rect, polyline and polygon
function transform(): void {
    this.m = this.el.node.getScreenCTM().inverse();
    this.offset = { x: window.pageXOffset, y: window.pageYOffset };
}

SVG.Element.prototype.draw.extend('rect', Object.assign({},
    SVG.Element.prototype.draw.plugins.rect,
    {
        transform: transform,
    },
));

SVG.Element.prototype.draw.extend('polyline', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    {
        transform: transform,
    },
));

SVG.Element.prototype.draw.extend('polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polygon,
    {
        transform: transform,
    },
));

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
            this.parent.node.getScreenCTM()
                .inverse()
                .multiply(this.el.node.getScreenCTM()),
        );

        this.set.add(
            this.parent
                .circle(5)
                .stroke({
                    width: 1,
                }).fill('#ccc')
                .center(p.x, p.y),
        );
    }
}

SVG.Element.prototype.draw.extend('line', Object.assign({},
    SVG.Element.prototype.draw.plugins.line,
    {
        drawCircles: drawCircles,
    }
));

SVG.Element.prototype.draw.extend('polyline', Object.assign({},
    SVG.Element.prototype.draw.plugins.polyline,
    {
        drawCircles: drawCircles,
    }
));

SVG.Element.prototype.draw.extend('polygon', Object.assign({},
    SVG.Element.prototype.draw.plugins.polygon,
    {
        drawCircles: drawCircles,
    }
));

// Fix method drag
const originalDraggable = SVG.Element.prototype.draggable;
SVG.Element.prototype.draggable = function constructor(...args: any): any {
    let handler = this.remember('_draggable');
    if (!handler) {
        originalDraggable.call(this, ...args);
        handler = this.remember('_draggable');
        handler.drag = function(e: any) {
            this.m = this.el.node.getScreenCTM().inverse();
            return handler.constructor.prototype.drag.call(this, e);
        }
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
        handler.resize = function(e: any) {
            if (e.detail.event.button === 0) {
                return handler.constructor.prototype.resize.call(this, e);
            }
        }
        handler.update = function(e: any) {
            this.m = this.el.node.getScreenCTM().inverse();
            return handler.constructor.prototype.update.call(this, e);
        }
    } else {
        originalResize.call(this, ...args);
    }

    return this;
};
for (const key of Object.keys(originalResize)) {
    SVG.Element.prototype.resize[key] = originalResize[key];
}


SVG.Cube = SVG.invent({
    create: 'g',
    inherit: SVG.G,
    extend: {

        constructorMethod(viewModel: any) {
            this.attr('points', viewModel.getPoints());
            this.projectionLineEnable = false;
            this.setupFaces(viewModel);
            this.setupEdges(viewModel);
            this.setupProjections(viewModel);
            this.setupGrabPoints();
            this.hideProjections();
            this.hideGrabPoints();

            return this;
        },

        setupFaces(viewModel: any) {
            this.face = this.polygon(viewModel.front.points);
            this.right = this.polygon(viewModel.right.points);
            this.dorsal = this.polygon(viewModel.dorsal.points);
            this.left = this.polygon(viewModel.left.points);
        },

        setupProjections(viewModel: any) {
            this.ftProj = this.line(this.updateProjectionLine(viewModel.ft.getEquation(),
                viewModel.ft.points[0], viewModel.vpl));
            this.fbProj = this.line(this.updateProjectionLine(viewModel.fb.getEquation(),
                viewModel.ft.points[0], viewModel.vpl));
            this.rtProj = this.line(this.updateProjectionLine(viewModel.rt.getEquation(),
                viewModel.rt.points[1], viewModel.vpr));
            this.rbProj = this.line(this.updateProjectionLine(viewModel.rb.getEquation(),
                viewModel.rb.points[1], viewModel.vpr));

            this.ftProj.stroke({ color: '#C0C0C0' });
            this.fbProj.stroke({ color: '#C0C0C0' });
            this.rtProj.stroke({ color: '#C0C0C0' });
            this.rbProj.stroke({ color: '#C0C0C0' });
        },

        setupEdges(viewModel: any) {
            this.frontLeftEdge = this.line(viewModel.fl.points);
            this.frontRightEdge = this.line(viewModel.fr.points);
            this.dorsalRightEdge = this.line(viewModel.dr.points);
            this.dorsalLeftEdge = this.line(viewModel.dl.points);

            this.frontTopEdge = this.line(viewModel.ft.points);
            this.rightTopEdge = this.line(viewModel.rt.points);
            this.frontBotEdge = this.line(viewModel.fb.points);
            this.rightBotEdge = this.line(viewModel.rb.points);
        },

        setupGrabPoints() {
            this.flCenter = this.circle().addClass('svg_select_points').addClass('svg_select_points_l');
            this.frCenter = this.circle().addClass('svg_select_points').addClass('svg_select_points_r');
            this.drCenter = this.circle().addClass('svg_select_points').addClass('svg_select_points_ew');
            this.dlCenter = this.circle().addClass('svg_select_points').addClass('svg_select_points_ew');

            this.ftCenter = this.circle().addClass('svg_select_points').addClass('svg_select_points_t');
            this.fbCenter = this.circle().addClass('svg_select_points').addClass('svg_select_points_b');

            const grabPoints = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < grabPoints.length; i += 1) {
                const edge = edges[`${i}`];
                const cx = (edge.attr('x2') + edge.attr('x1')) / 2;
                const cy = (edge.attr('y2') + edge.attr('y1')) / 2;
                grabPoints[`${i}`].center(cx, cy);
            }
        },

        updateGrabPoints() {
            const centers = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < centers.length; i += 1) {
                const edge = edges[`${i}`];
                centers[`${i}`].center(edge.cx(), edge.cy());
            }
        },

        move(dx: Number, dy: Number) {
            this.face.dmove(dx, dy);
            this.dorsal.dmove(dx, dy);
            this.right.dmove(dx, dy);
            this.left.dmove(dx, dy);

            const edges = this.getEdges();
            edges.forEach((edge: any) => {
                edge.dmove(dx, dy);
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

        showGrabPoints() {
            const grabPoints = this.getGrabPoints();
            grabPoints.forEach((point: any) => {
                point.show();
            });
        },

        hideGrabPoints() {
            const grabPoints = this.getGrabPoints();
            grabPoints.forEach((point: any) => {
                point.hide();
            });
        },

        updateView(viewModel: any) {
            const convertedPoints = window.cvat.translate.points.actualToCanvas(
                viewModel.getPoints(),
            );
            this.updatePolygons(viewModel);
            this.updateLines(viewModel);
            this.updateProjections(viewModel);
            this.updateGrabPoints();
            this.attr('points', convertedPoints);
        },

        updatePolygons(viewModel: any) {
            this.face.plot(viewModel.front.points);
            this.right.plot(viewModel.right.points);
            this.dorsal.plot(viewModel.dorsal.points);
            this.left.plot(viewModel.left.points);
        },

        updateLines(viewModel: any) {
            this.frontLeftEdge.plot(viewModel.fl.points);
            this.frontRightEdge.plot(viewModel.fr.points);
            this.dorsalRightEdge.plot(viewModel.dr.points);
            this.dorsalLeftEdge.plot(viewModel.dl.points);

            this.frontTopEdge.plot(viewModel.ft.points);
            this.rightTopEdge.plot(viewModel.rt.points);
            this.frontBotEdge.plot(viewModel.fb.points);
            this.rightBotEdge.plot(viewModel.rb.points);
        },

        updateThickness() {
            const edges = this.getEdges();
            const width = this.attr('stroke-width');
            const baseWidthOffset = 1.75;
            const expandedWidthOffset = 3;
            edges.forEach((edge: any) => {
                edge.on('mouseover', function () {
                    this.attr({ 'stroke-width': width * expandedWidthOffset });
                }).on('mouseout', function () {
                    this.attr({ 'stroke-width': width * baseWidthOffset });
                }).stroke({ width: width * baseWidthOffset, linecap: 'round' });
            });
        },

        updateProjections(viewModel: any) {
            this.ftProj.plot(this.updateProjectionLine(viewModel.ft.getEquation(),
                viewModel.ft.points[0], viewModel.vplCanvas));
            this.fbProj.plot(this.updateProjectionLine(viewModel.fb.getEquation(),
                viewModel.ft.points[0], viewModel.vplCanvas));
            this.rtProj.plot(this.updateProjectionLine(viewModel.rt.getEquation(),
                viewModel.rt.points[1], viewModel.vprCanvas));
            this.rbProj.plot(this.updateProjectionLine(viewModel.rb.getEquation(),
                viewModel.rt.points[1], viewModel.vprCanvas));
        },

        paintOrientationLines() {
            const fillColor = this.attr('fill');
            const selectedColor = '#ff007f';
            this.frontTopEdge.stroke({ color: selectedColor });
            this.frontLeftEdge.stroke({ color: selectedColor });
            this.frontBotEdge.stroke({ color: selectedColor });
            this.frontRightEdge.stroke({ color: selectedColor });

            this.rightTopEdge.stroke({ color: fillColor });
            this.rightBotEdge.stroke({ color: fillColor });
            this.dorsalRightEdge.stroke({ color: fillColor });
            this.dorsalLeftEdge.stroke({ color: fillColor });

            this.face.stroke({ color: fillColor, width: 0 });
            this.right.stroke({ color: fillColor });
            this.dorsal.stroke({ color: fillColor });
            this.left.stroke({ color: fillColor });
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

        updateProjectionLine(equation: any, source: any, direction: any) {
            const x1 = source[0];
            const y1 = equation.getY(x1);

            const x2 = direction[0];
            const y2 = equation.getY(x2);
            return [[x1, y1], [x2, y2]];
        },

        addMouseOverEvents() {
            this._addFaceEvents();
        },

        _addFaceEvents() {
            const group = this;
            this.left.on('mouseover', function () {
                this.attr({ 'fill-opacity': 0.5 });
            }).on('mouseout', function () {
                this.attr({ 'fill-opacity': group.attr('fill-opacity') });
            });
            this.dorsal.on('mouseover', function () {
                this.attr({ 'fill-opacity': 0.5 });
            }).on('mouseout', function () {
                this.attr({ 'fill-opacity': group.attr('fill-opacity') });
            });
            this.right.on('mouseover', function () {
                this.attr({ 'fill-opacity': 0.5 });
            }).on('mouseout', function () {
                this.attr({ 'fill-opacity': group.attr('fill-opacity') });
            });
        },

        removeMouseOverEvents() {
            const edges = this.getEdges();
            edges.forEach((edge: any) => {
                edge.off('mouseover').off('mouseout');
            });
            this.left.off('mouseover').off('mouseout');
            this.dorsal.off('mouseover').off('mouseout');
            this.right.off('mouseover').off('mouseout');
        },

        resetFaceOpacity() {
            const group = this;
            this.left.attr({ 'fill-opacity': group.attr('fill-opacity') });
            this.dorsal.attr({ 'fill-opacity': group.attr('fill-opacity') });
            this.right.attr({ 'fill-opacity': group.attr('fill-opacity') });
        },

        addOccluded() {
            const edges = this.getEdges();
            edges.forEach((edge: any) => {
                edge.node.classList.add('occludedShape');
            });
            this.face.attr('stroke-width', 0);
            this.right.attr('stroke-width', 0);
            this.left.node.classList.add('occludedShape');
            this.dorsal.node.classList.add('occludedShape');
        },

        removeOccluded() {
            const edges = this.getEdges();
            edges.forEach((edge: any) => {
                edge.node.classList.remove('occludedShape');
            });
            this.face.attr('stroke-width', this.attr('stroke-width'));
            this.right.attr('stroke-width', this.attr('stroke-width'));
            this.left.node.classList.remove('occludedShape');
            this.dorsal.node.classList.remove('occludedShape');
        },
    },
    construct: {
        cube(points: Number[]) {
            // tslint:disable-next-line
            return this.put(new SVG.Cube()).constructorMethod(points);
        },
    },
});
