// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */
import * as SVG from 'svg.js';
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

import { Equation, MIN_EDGE_LENGTH } from './cuboid';

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

        constructorMethod(viewModel) {
            this.viewModel = viewModel;
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

        setupFaces(viewModel) {
            this.face = this.polygon(viewModel.front.canvasPoints);
            this.right = this.polygon(viewModel.right.canvasPoints);
            this.dorsal = this.polygon(viewModel.dorsal.canvasPoints);
            this.left = this.polygon(viewModel.left.canvasPoints);
        },

        setupProjections(viewModel) {
            this.ftProj = this.line(this.updateProjectionLine(viewModel.ft.getEquation(),
                viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.fbProj = this.line(this.updateProjectionLine(viewModel.fb.getEquation(),
                viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.rtProj = this.line(this.updateProjectionLine(viewModel.rt.getEquation(),
                viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
            this.rbProj = this.line(this.updateProjectionLine(viewModel.rb.getEquation(),
                viewModel.rb.canvasPoints[1], viewModel.vprCanvas));

            this.ftProj.stroke({ color: '#C0C0C0' });
            this.fbProj.stroke({ color: '#C0C0C0' });
            this.rtProj.stroke({ color: '#C0C0C0' });
            this.rbProj.stroke({ color: '#C0C0C0' });
        },

        setupEdges(viewModel) {
            this.frontLeftEdge = this.line(viewModel.fl.canvasPoints);
            this.frontRightEdge = this.line(viewModel.fr.canvasPoints);
            this.dorsalRightEdge = this.line(viewModel.dr.canvasPoints);
            this.dorsalLeftEdge = this.line(viewModel.dl.canvasPoints);

            this.frontTopEdge = this.line(viewModel.ft.canvasPoints);
            this.rightTopEdge = this.line(viewModel.rt.canvasPoints);
            this.frontBotEdge = this.line(viewModel.fb.canvasPoints);
            this.rightBotEdge = this.line(viewModel.rb.canvasPoints);
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

        addEvents() {
            const edges = this.getEdges();
            const grabPoints =this.getGrabPoints();
            const draggableFaces = [
                this.left,
                this.dorsal,
                this.right,
            ];

            if (this.viewModel.dl.points[0].x > this.viewModel.fl.points[0].x) {
                this.orientation = 1;
            } else {
                this.orientation = 2;
            }

            this.updateGrabPoints();
            edges.forEach((edge) => {
                edge.on('resizestart', () => {
                    // TODO: dipatch proper canvas event
                }).on('resizedone', () => {
                    this.updateModel();
                    this.updateViewModel();
                    // TODO: dipatch proper canvas event
                });
            });
            grabPoints.forEach((grabPoint) => {
                grabPoint.on('dragstart', () => {
                    // TODO: dipatch proper canvas event
                }).on('dragend', () => {
                    // TODO: dipatch proper canvas event
                    this.updateModel();
                    this.updateViewModel();
                });
            });

            draggableFaces.forEach((face) => {
                face.on('dragstart', () => {
                    // TODO: dipatch proper canvas event
                }).on('dragend', () => {
                    // TODO: dipatch proper canvas event
                    this.updateModel();
                    this.updateViewModel();
                    this.updateGrabPoints();
                });
            });

            this.makeDraggable();
            // this.makeResizable();
        },

        makeDraggable() {
            let startPoint: any = null;
            let startPosition: any = null;

            this.draggable().off('dragend').on('dragstart', (e) => {
                startPoint = e.detail.p;
                startPosition = this.viewModel.getPoints();
            }).on('dragmove', (e) => {
                e.preventDefault();
                this.translatePoints(startPoint, startPosition, e.detail.p);
                this.refreshView();
            }).on('dragend', () => {
                this.updateModel();
                this.updateViewModel();
            });

            // Controllable vertical edges
            this.flCenter.draggable(function (x) {
                const vpX = this.cx() - this.viewModel.vplCanvas.x > 0 ? this.viewModel.vplCanvas.x : 0;
                return { x: x < this.viewModel.fr.canvasPoints[0].x && x > vpX + MIN_EDGE_LENGTH };
            }).on('dragmove', function () {
                this.frontLeftEdge.center(this.cx(), this.cy());

                const [ position ] = this.viewModel.canvasToActual([{x: this.frontLeftEdge.attr('x1'), y: this.frontLeftEdge.attr('y1')}]);
                const { x } = position;

                const y1 = this.viewModel.ft.getEquation().getY(x);
                const y2 = this.viewModel.fb.getEquation().getY(x);

                const topPoint = { x, y: y1 };
                const botPoint = { x, y: y2 };

                this.viewModel.fl.points = [topPoint, botPoint];
                this.updateViewAndVM();
            });

            this.drCenter.draggable(function (x) {
                let xStatus;
                if (this.cx() < this.viewModel.fr.canvasPoints[0].x) {
                    xStatus = x < this.viewModel.fr.canvasPoints[0].x - MIN_EDGE_LENGTH
                        && x > this.viewModel.vprCanvas.x + MIN_EDGE_LENGTH;
                } else {
                    xStatus = x > this.viewModel.fr.canvasPoints[0].x + MIN_EDGE_LENGTH
                        && x < this.viewModel.vprCanvas.x - MIN_EDGE_LENGTH;
                }
                return { x: xStatus, y: this.attr('y1') };
            }).on('dragmove', function () {
                this.dorsalRightEdge.center(this.cx(), this.cy());

                const [ position ] = this.viewModel.canvasToActual([{x: this.dorsalRightEdge.attr('x1'), y: this.dorsalRightEdge.attr('y1')}]);
                const { x } = position;

                const y1 = this.viewModel.rt.getEquation().getY(x);
                const y2 = this.viewModel.rb.getEquation().getY(x);

                const topPoint = { x, y: y1 };
                const botPoint = { x, y: y2 };

                this.viewModel.dr.points = [topPoint, botPoint];
                this.updateViewAndVM();
            });

            this.dlCenter.draggable(function (x) {
                let xStatus;
                if (this.cx() < this.viewModel.fl.canvasPoints[0].x) {
                    xStatus = x < this.viewModel.fl.canvasPoints[0].x - MIN_EDGE_LENGTH
                        && x > this.viewModel.vprCanvas.x + MIN_EDGE_LENGTH;
                } else {
                    xStatus = x > this.viewModel.fl.canvasPoints[0].x + MIN_EDGE_LENGTH
                        && x < this.viewModel.vprCanvas.x + MIN_EDGE_LENGTH;
                }
                return { x: xStatus, y: this.attr('y1') };
            }).on('dragmove', function () {
                this.dorsalLeftEdge.center(this.cx(), this.cy());

                const position = this.viewModel.canvasToActual([{x: this.dorsalLeftEdge.attr('x1'), y: this.dorsalLeftEdge.attr('y1')}]);
                const { x } = position;

                const y1 = this.viewModel.lt.getEquation().getY(x);
                const y2 = this.viewModel.lb.getEquation().getY(x);

                const topPoint = { x, y: y1 };
                const botPoint = { x, y: y2 };

                this.viewModel.dl.points = [topPoint, botPoint];
                this.updateViewAndVM(true);
            });

            this.frCenter.draggable((x) =>  {
                return { x: x > this.viewModel.fl.canvasPoints[0].x, y: this.attr('y1') };
            }).on('dragmove', () => {
                this.frontRightEdge.center(this.cx(), this.cy());

                const [ position ]= this.viewModel.canvasToActual([{x: this.frontRightEdge.attr('x1'), y: this.frontRightEdge.attr('y1')}]);
                const { x } = position;

                const y1 = this.viewModel.ft.getEquation().getY(x);
                const y2 = this.viewModel.fb.getEquation().getY(x);

                const topPoint = { x, y: y1 };
                const botPoint = { x, y: y2 };

                this.viewModel.fr.points = [topPoint, botPoint];
                this.updateViewAndVM(true);
            });


            // Controllable 'horizontal' edges
            this.ftCenter.draggable((x, y) => {
                return { x: x === this.cx(), y: y < this.fbCenter.cy() - MIN_EDGE_LENGTH };
            }).on('dragmove', () => {
                this.frontTopEdge.center(this.cx(), this.cy());
                this.horizontalEdgeControl(this.viewModel.top, this.frontTopEdge.attr('x2'), this.frontTopEdge.attr('y2'));
                this.updateViewAndVM();
            });

            this.fbCenter.draggable((x, y) => {
                return { x: x === this.cx(), y: y > this.ftCenter.cy() + MIN_EDGE_LENGTH };
            }).on('dragmove', () => {
                this.frontBotEdge.center(this.cx(), this.cy());
                this.horizontalEdgeControl(this.viewModel.bot, this.frontBotEdge.attr('x2'), this.frontBotEdge.attr('y2'));
                this.updateViewAndVM();
            });

            // Controllable faces
            this.left.draggable((x, y) => ({ x: x < Math.min(this.viewModel.dr.canvasPoints[0].x, this.viewModel.fr.canvasPoints[0].x) - MIN_EDGE_LENGTH, y })).on('dragmove', () => {
                this.faceDragControl(this.viewModel.left, this.attr('points'));
            });
            this.dorsal.draggable().on('dragmove', () => {
                this.faceDragControl(this.viewModel.dorsal, this.attr('points'));
            });
            this.right.draggable((x, y) => ({ x: x > Math.min(this.viewModel.dl.canvasPoints[0].x, this.viewModel.fl.canvasPoints[0].x) + MIN_EDGE_LENGTH, y })).on('dragmove', () => {
                this.faceDragControl(this.viewModel.right, this.attr('points'), true);
            });
        },

        translatePoints(startPoint, startPosition, currentPosition) {
            const dx = currentPosition.x - startPoint.x;
            const dy = currentPosition.y - startPoint.y;
            const newPoints: any[] = [];
            for (let i = 0; i < startPosition.length; i += 1) {
                newPoints[i] = { x: startPosition[i].x + dx, y: startPosition[i].y + dy };
            }
            this.viewModel.setPoints(newPoints);
        },

        computeHeightFace(point, index) {
            switch (index) {
            // fl
            case 1: {
                const p2 = this.updatedEdge(this.viewModel.fr.points[0], point, this.viewModel.vpl);
                const p3 = this.updatedEdge(this.viewModel.dr.points[0], p2, this.viewModel.vpr);
                const p4 = this.updatedEdge(this.viewModel.dl.points[0], point, this.viewModel.vpr);
                return [point, p2, p3, p4];
            }
            // fr
            case 2: {
                const p2 = this.updatedEdge(this.viewModel.fl.points[0], point, this.viewModel.vpl);
                const p3 = this.updatedEdge(this.viewModel.dr.points[0], point, this.viewModel.vpr);
                const p4 = this.updatedEdge(this.viewModel.dl.points[0], p3, this.viewModel.vpr);
                return [p2, point, p3, p4];
            }
            // dr
            case 3: {
                const p2 = this.updatedEdge(this.viewModel.dl.points[0], point, this.viewModel.vpl);
                const p3 = this.updatedEdge(this.viewModel.fr.points[0], point, this.viewModel.vpr);
                const p4 = this.updatedEdge(this.viewModel.fl.points[0], p2, this.viewModel.vpr);
                return [p4, p3, point, p2];
            }
            // dl
            case 4: {
                const p2 = this.updatedEdge(this.viewModel.dr.points[0], point, this.viewModel.vpl);
                const p3 = this.updatedEdge(this.viewModel.fl.points[0], point, this.viewModel.vpr);
                const p4 = this.updatedEdge(this.viewModel.fr.points[0], p2, this.viewModel.vpr);
                return [p3, p4, p2, point];
            }
            default: {
                return [null, null, null, null];
            }
            }
        },

        updateViewAndVM() {
            this.viewModel.buildBackEdge();
            this.refreshView();
        },

        refreshView() {
            // TODO: fixit
            this.udpateView(this.viewModel);
        },

        updatedEdge(target, base, pivot) {
            const targetX = target.x;
            const line = new Equation(pivot,
                [base.x, base.y], this.viewModel);
            const newY = line.getY(targetX);
            return { x: targetX, y: newY };
        },

        resizeControl(vmEdge, updatedEdge, constraints) {
            const [ topPoint ] = this.viewModel.canvasToActual([{x: updatedEdge.attr('x1'), y: updatedEdge.attr('y1')}]);
            const [ botPoint ] = this.viewModel.canvasToActual([{x: updatedEdge.attr('x2'), y: updatedEdge.attr('y2')}]);

            topPoint.y = Math.min(Math.max(topPoint.y, constraints.y1Range.min), constraints.y1Range.max);
            botPoint.y = Math.min(Math.max(botPoint.y, constraints.y2Range.min), constraints.y2Range.max);

            vmEdge.points = [topPoint, botPoint];
        },

        updateGrabPoints() {
            const centers = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < centers.length; i += 1) {
                const edge = edges[`${i}`];
                centers[`${i}`].center(edge.cx(), edge.cy());
            }

            this.dorsalRightEdge.selectize({
                points: 't,b',
                rotationPoint: false,
            }).resize().on('resizing', function (e) {
                if (e.detail.event.shiftKey) {
                    this.resizeControl(this.viewModel.dr,
                        this,
                        this.viewModel.computeSideEdgeConstraints(this.viewModel.dr));
                } else {
                    const [ midPointUp ] = this.viewModel.canvasToActual([{x: this.dorsalRightEdge.attr('x1'), y: this.dorsalRightEdge.attr('y1')}])[0];
                    const [ midPointDown ] = this.viewModel.canvasToActual([{x: this.dorsalRightEdge.attr('x2'), y: this.dorsalRightEdge.attr('y2')}])[0];
                    this.viewModel.top.points = this.computeHeightFace(midPointUp, 3);
                    this.viewModel.bot.points = this.computeHeightFace(midPointDown, 3);
                }
                this.updateViewAndVM();
            });
            this.drCenter.show();

            this.dorsalLeftEdge.selectize(false);
            this.dlCenter.hide();
        },

        move(dx, dy) {
            this.face.dmove(dx, dy);
            this.dorsal.dmove(dx, dy);
            this.right.dmove(dx, dy);
            this.left.dmove(dx, dy);

            const edges = this.getEdges();
            edges.forEach((edge) => {
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

        showGrabPoints(radius: number, stroke: number, color: string) {
            const grabPoints = this.getGrabPoints();
            grabPoints.forEach((point) => {
                point.radius(radius).attr('stroke-width', stroke).show();
            });
        },

        hideGrabPoints() {
            const grabPoints = this.getGrabPoints();
            grabPoints.forEach((point) => {
                point.hide();
            });
        },

        updateView(viewModel) {
            const convertedPoints = window.cvat.translate.points.actualToCanvas(
                viewModel.getPoints(),
            );
            this.updatePolygons(viewModel);
            this.updateLines(viewModel);
            this.updateProjections(viewModel);
            this.updateGrabPoints();
            this.attr('points', convertedPoints);
        },

        updatePolygons(viewModel) {
            this.face.plot(viewModel.front.canvasPoints);
            this.right.plot(viewModel.right.canvasPoints);
            this.dorsal.plot(viewModel.dorsal.canvasPoints);
            this.left.plot(viewModel.left.canvasPoints);
        },

        updateLines(viewModel) {
            this.frontLeftEdge.plot(viewModel.fl.canvasPoints);
            this.frontRightEdge.plot(viewModel.fr.canvasPoints);
            this.dorsalRightEdge.plot(viewModel.dr.canvasPoints);
            this.dorsalLeftEdge.plot(viewModel.dl.canvasPoints);

            this.frontTopEdge.plot(viewModel.ft.canvasPoints);
            this.rightTopEdge.plot(viewModel.rt.canvasPoints);
            this.frontBotEdge.plot(viewModel.fb.canvasPoints);
            this.rightBotEdge.plot(viewModel.rb.canvasPoints);
        },

        updateThickness() {
            const edges = this.getEdges();
            const width = this.attr('stroke-width');
            const baseWidthOffset = 1.75;
            const expandedWidthOffset = 3;
            edges.forEach((edge) => {
                edge.on('mouseover', function () {
                    this.attr({ 'stroke-width': width * expandedWidthOffset });
                }).on('mouseout', function () {
                    this.attr({ 'stroke-width': width * baseWidthOffset });
                }).stroke({ width: width * baseWidthOffset, linecap: 'round' });
            });
        },

        updateProjections(viewModel) {
            this.ftProj.plot(this.updateProjectionLine(viewModel.ft.getEquation(),
                viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.fbProj.plot(this.updateProjectionLine(viewModel.fb.getEquation(),
                viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.rtProj.plot(this.updateProjectionLine(viewModel.rt.getEquation(),
                viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
            this.rbProj.plot(this.updateProjectionLine(viewModel.rb.getEquation(),
                viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
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

        updateProjectionLine(equation, source, direction) {
            const x1 = source.x;
            const y1 = equation.getYCanvas(x1);

            const x2 = direction.x;
            const y2 = equation.getYCanvas(x2);
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
            edges.forEach((edge) => {
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
            edges.forEach((edge) => {
                edge.node.classList.add('occludedShape');
            });
            this.face.attr('stroke-width', 0);
            this.right.attr('stroke-width', 0);
            this.left.node.classList.add('occludedShape');
            this.dorsal.node.classList.add('occludedShape');
        },

        removeOccluded() {
            const edges = this.getEdges();
            edges.forEach((edge) => {
                edge.node.classList.remove('occludedShape');
            });
            this.face.attr('stroke-width', this.attr('stroke-width'));
            this.right.attr('stroke-width', this.attr('stroke-width'));
            this.left.node.classList.remove('occludedShape');
            this.dorsal.node.classList.remove('occludedShape');
        },
    },
    construct: {
        cube(points) {
            return this.put(new SVG.Cube()).constructorMethod(points);
        },
    },
});