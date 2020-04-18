// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */
import * as SVG from 'svg.js';
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

import consts from './consts';
import { 
    Point,
    Equation,
    CuboidModel,
    Orientation,
} from './cuboid';
import { parsePoints, stringifyPoints } from './shared';

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


(SVG as any).Cube = SVG.invent({
    create: 'g',
    inherit: SVG.G,
    extend: {
        constructorMethod(points: string) {
            this.cuboidModel = new CuboidModel(parsePoints(points));
            this.setupFaces();
            this.setupEdges();
            this.setupProjections();
            this.hideProjections();

            this.attr('points', points);
            return this;
        },

        setupFaces() {
            this.face = this.polygon(this.cuboidModel.front.points);
            this.right = this.polygon(this.cuboidModel.right.points);
            this.dorsal = this.polygon(this.cuboidModel.dorsal.points);
            this.left = this.polygon(this.cuboidModel.left.points);
        },

        setupProjections() {
            this.ftProj = this.line(this.updateProjectionLine(this.cuboidModel.ft.getEquation(),
                this.cuboidModel.ft.points[0], this.cuboidModel.vpl));
            this.fbProj = this.line(this.updateProjectionLine(this.cuboidModel.fb.getEquation(),
                this.cuboidModel.ft.points[0], this.cuboidModel.vpl));
            this.rtProj = this.line(this.updateProjectionLine(this.cuboidModel.rt.getEquation(),
                this.cuboidModel.rt.points[1], this.cuboidModel.vpr));
            this.rbProj = this.line(this.updateProjectionLine(this.cuboidModel.rb.getEquation(),
                this.cuboidModel.rb.points[1], this.cuboidModel.vpr));

            this.ftProj.stroke({ color: '#C0C0C0' });
            this.fbProj.stroke({ color: '#C0C0C0' });
            this.rtProj.stroke({ color: '#C0C0C0' });
            this.rbProj.stroke({ color: '#C0C0C0' });
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

        updateProjectionLine(equation: Equation, source: Point, direction: Point) {
            const x1 = source.x;
            const y1 = equation.getY(x1);

            const x2 = direction.x;
            const y2 = equation.getY(x2);
            return [[x1, y1], [x2, y2]];
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
                return;
            }

            const accumulatedOffset: Point = {
                x: 0,
                y: 0,
            };
            let cubePoints: Point[] = [];
            let resizablePointIndex: null | number = null;
            
            this.face.on('resizestart', (event: CustomEvent) => {
                cubePoints = JSON.parse(JSON.stringify(this.cuboidModel.getPoints()));
                const { target } = event.detail.event.detail.event;
                const { parentElement } = target;
                resizablePointIndex = Array
                    .from(parentElement.children)
                    .indexOf(target);
                this.fire(new CustomEvent('resizestart', event));
                accumulatedOffset.x = 0;
                accumulatedOffset.y = 0;
            }).on('resizing', (event: CustomEvent) => {
                let { dx, dy } = event.detail;
                let dxPortion = dx - accumulatedOffset.x;
                let dyPortion = dy - accumulatedOffset.y;
                accumulatedOffset.x += dxPortion;
                accumulatedOffset.y += dyPortion;

                let facePoints = parsePoints(this.face.attr('points'));

                if (facePoints[2].x - facePoints[1].x + dx < consts.MIN_EDGE_LENGTH 
                    || facePoints[1].y - facePoints[0].y + dy < consts.MIN_EDGE_LENGTH
                ) {
                    this.face.plot(this.cuboidModel.front.points);
                    return;
                }

                if ([0, 1].includes(resizablePointIndex)) {
                    let cuboidPoints = this.cuboidModel.getPoints();

                    const x1 = cuboidPoints[0].x + dxPortion;
                    const x2 = cuboidPoints[1].x + dxPortion;
                    const y1 = this.cuboidModel.ft.getEquation().getY(x1);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x2);
                    const topPoint = { x: x1, y: y1 };
                    const botPoint = { x: x2, y: y2 };

                    this.cuboidModel.fl.points = [topPoint, botPoint];
                    this.updateViewAndVM();

                    
                    cuboidPoints = this.cuboidModel.getPoints();
                    let midPointUp: Point | null = null;
                    let midPointDown: Point | null = null;
                    if (resizablePointIndex === 0) {
                        midPointUp = { x: cuboidPoints[0].x, y: cuboidPoints[0].y + dyPortion }
                        midPointDown = { x: cuboidPoints[1].x, y: cuboidPoints[1].y };
                    } else if (resizablePointIndex === 1) {
                        midPointUp = { x: cuboidPoints[0].x, y: cuboidPoints[0].y };
                        midPointDown = { x: cuboidPoints[1].x, y: cuboidPoints[1].y + dyPortion };
                    }
                    
                    const topPoints = this.computeHeightFace(midPointUp, 1);
                    const bottomPoints = this.computeHeightFace(midPointDown, 1);
                    this.cuboidModel.top.points = topPoints;
                    this.cuboidModel.bot.points = bottomPoints;                        
                    this.updateViewAndVM(false);                        
                } else if ([2, 3].includes(resizablePointIndex)) {
                    let cuboidPoints = this.cuboidModel.getPoints();

                    const x1 = cuboidPoints[2].x + dxPortion;
                    const x2 = cuboidPoints[3].x + dxPortion;
                    const y1 = this.cuboidModel.ft.getEquation().getY(x1);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x2);
                    const topPoint = { x: x1, y: y1 };
                    const botPoint = { x: x2, y: y2 };

                    this.cuboidModel.fr.points = [topPoint, botPoint];
                    this.updateViewAndVM(true);



                    cuboidPoints = this.cuboidModel.getPoints();
                    let midPointUp: Point | null = null;
                    let midPointDown: Point | null = null;
                    if (resizablePointIndex === 3) {
                        midPointUp = { x: cuboidPoints[2].x, y: cuboidPoints[2].y + dyPortion }
                        midPointDown = { x: cuboidPoints[3].x, y: cuboidPoints[3].y };
                    } else if (resizablePointIndex === 2) {
                        midPointUp = { x: cuboidPoints[2].x, y: cuboidPoints[2].y };
                        midPointDown = { x: cuboidPoints[3].x, y: cuboidPoints[3].y + dyPortion };
                    }
                    
                    const topPoints = this.computeHeightFace(midPointUp, 2);
                    const bottomPoints = this.computeHeightFace(midPointDown, 2);
                    this.cuboidModel.top.points = topPoints;
                    this.cuboidModel.bot.points = bottomPoints;                        
                    this.updateViewAndVM(false);                             
                }

                this.face.plot(this.cuboidModel.front.points);
                this.fire(new CustomEvent('resizing', event));
            }).on('resizedone', (event: CustomEvent) => {
                this.fire(new CustomEvent('resizedone', event));
            });

            if (this.cuboidModel.orientation === Orientation.LEFT) {
                this.dorsalRightEdge.resize(value);
                this.dorsalRightEdge.on('resizestart', (event: CustomEvent) => {
                    cubePoints = JSON.parse(JSON.stringify(this.cuboidModel.getPoints()));
                    const { target } = event.detail.event.detail.event;
                    const { parentElement } = target;
                    resizablePointIndex = Array
                        .from(parentElement.children)
                        .indexOf(target);
                    this.fire(new CustomEvent('resizestart', event));
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;
                }).on('resizing', (event: CustomEvent) => {
                    let { dx, dy } = event.detail;
                    let dxPortion = dx - accumulatedOffset.x;
                    let dyPortion = dy - accumulatedOffset.y;
                    accumulatedOffset.x += dxPortion;
                    accumulatedOffset.y += dyPortion;

                    let cuboidPoints = this.cuboidModel.getPoints();

                    const x1 = cuboidPoints[4].x + dxPortion;
                    const x2 = cuboidPoints[5].x + dxPortion;
                    const y1 = this.cuboidModel.rt.getEquation().getY(x1);
                    const y2 = this.cuboidModel.rb.getEquation().getY(x2);
                    const topPoint = { x: x1, y: y1 };
                    const botPoint = { x: x2, y: y2 };

                    this.cuboidModel.dr.points = [topPoint, botPoint];
                    this.updateViewAndVM();



                    cuboidPoints = this.cuboidModel.getPoints();
                    let midPointUp: Point | null = null;
                    let midPointDown: Point | null = null;
                    if (resizablePointIndex === 0) {
                        midPointUp = { x: cuboidPoints[4].x, y: cuboidPoints[4].y + dyPortion }
                        midPointDown = { x: cuboidPoints[5].x, y: cuboidPoints[5].y };
                    } else if (resizablePointIndex === 1) {
                        midPointUp = { x: cuboidPoints[4].x, y: cuboidPoints[4].y };
                        midPointDown = { x: cuboidPoints[5].x, y: cuboidPoints[5].y + dyPortion };
                    }
                    
                    const topPoints = this.computeHeightFace(midPointUp, 3);
                    const bottomPoints = this.computeHeightFace(midPointDown, 3);
                    this.cuboidModel.top.points = topPoints;
                    this.cuboidModel.bot.points = bottomPoints;                        
                    this.updateViewAndVM(false);  

                    this.face.plot(this.cuboidModel.front.points);
                    this.fire(new CustomEvent('resizing', event));
                }).on('resizedone', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });
            } else {
                this.dorsalLeftEdge.resize();
                this.dorsalLeftEdge.on('resizestart', (event: CustomEvent) => {
                    cubePoints = JSON.parse(JSON.stringify(this.cuboidModel.getPoints()));
                    const { target } = event.detail.event.detail.event;
                    const { parentElement } = target;
                    resizablePointIndex = Array
                        .from(parentElement.children)
                        .indexOf(target);
                    this.fire(new CustomEvent('resizestart', event));
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;
                }).on('resizing', (event: CustomEvent) => {
                    let { dx, dy } = event.detail;
                    let dxPortion = dx - accumulatedOffset.x;
                    let dyPortion = dy - accumulatedOffset.y;
                    accumulatedOffset.x += dxPortion;
                    accumulatedOffset.y += dyPortion;

                    let cuboidPoints = this.cuboidModel.getPoints();

                    const x1 = cuboidPoints[6].x + dxPortion;
                    const x2 = cuboidPoints[7].x + dxPortion;
                    const y1 = this.cuboidModel.lt.getEquation().getY(x1);
                    const y2 = this.cuboidModel.lb.getEquation().getY(x2);
                    const topPoint = { x: x1, y: y1 };
                    const botPoint = { x: x2, y: y2 };

                    this.cuboidModel.dl.points = [topPoint, botPoint];
                    this.updateViewAndVM(true);



                    cuboidPoints = this.cuboidModel.getPoints();
                    let midPointUp: Point | null = null;
                    let midPointDown: Point | null = null;
                    if (resizablePointIndex === 0) {
                        midPointUp = { x: cuboidPoints[6].x, y: cuboidPoints[6].y + dyPortion }
                        midPointDown = { x: cuboidPoints[7].x, y: cuboidPoints[7].y };
                    } else if (resizablePointIndex === 1) {
                        midPointUp = { x: cuboidPoints[6].x, y: cuboidPoints[6].y };
                        midPointDown = { x: cuboidPoints[7].x, y: cuboidPoints[7].y + dyPortion };
                    }
                    
                    const topPoints = this.computeHeightFace(midPointUp, 4);
                    const bottomPoints = this.computeHeightFace(midPointDown, 4);
                    this.cuboidModel.top.points = topPoints;
                    this.cuboidModel.bot.points = bottomPoints;                        
                    this.updateViewAndVM(false);  

                    this.face.plot(this.cuboidModel.front.points);
                    this.fire(new CustomEvent('resizing', event));
                }).on('resizedone', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });
            }                

            return this;
        },

        _attr: SVG.Element.prototype.attr,

        attr(a: any, v: any, n: any) {
            const _attr = SVG.Element.prototype.attr.bind(this);
            if (a === 'fill' && v !== undefined) {
                _attr(a, v, n);
                this.paintOrientationLines();
            } else if (a === 'stroke-width' && typeof v === "number") {
                _attr(a, v, n);
                this.updateThickness();
            } else {
                return _attr(a, v, n);
            }

            return this;
        },

        updateThickness() {
            const edges = [this.frontLeftEdge, this.frontRightEdge, this.frontTopEdge, this.frontBotEdge]
            const width = this.attr('stroke-width');
            edges.forEach((edge: SVG.Element) => {
                edge.attr('stroke-width', width * (this.strokeOffset || 1.75));
            });
            this.on('mouseover', () => {
                edges.forEach((edge: SVG.Element) => {
                    this.strokeOffset = 2.5;
                    edge.attr('stroke-width', width * this.strokeOffset);
                })
            }).on('mouseout', () => {
                edges.forEach((edge: SVG.Element) => {
                    this.strokeOffset = 1.75;
                    edge.attr('stroke-width', width * this.strokeOffset);
                })
            });
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

        dmove(dx: number, dy: number) {
            this.cuboidModel.points.forEach((point: Point) => {
                point.x += dx;
                point.y += dy;
            });

            this.updateViewAndVM();
        },

        updateViewAndVM(build: boolean) {
            this.cuboidModel.updateOrientation();
            this.cuboidModel.buildBackEdge(build);
            this.updateView();
            this._attr('points', stringifyPoints(this.cuboidModel.points));
        },

        updatePolygons() {
            this.face.plot(this.cuboidModel.front.points);
            this.right.plot(this.cuboidModel.right.points);
            this.dorsal.plot(this.cuboidModel.dorsal.points);
            this.left.plot(this.cuboidModel.left.points);
        },

        updateLines() {
            this.frontLeftEdge.plot(this.cuboidModel.fl.points);
            this.frontRightEdge.plot(this.cuboidModel.fr.points);
            this.dorsalRightEdge.plot(this.cuboidModel.dr.points);
            this.dorsalLeftEdge.plot(this.cuboidModel.dl.points);

            this.frontTopEdge.plot(this.cuboidModel.ft.points);
            this.rightTopEdge.plot(this.cuboidModel.rt.points);
            this.frontBotEdge.plot(this.cuboidModel.fb.points);
            this.rightBotEdge.plot(this.cuboidModel.rb.points);
        },

        updateProjections() {
            this.ftProj.plot(this.updateProjectionLine(this.cuboidModel.ft.getEquation(),
                this.cuboidModel.ft.points[0], this.cuboidModel.vpl));
            this.fbProj.plot(this.updateProjectionLine(this.cuboidModel.fb.getEquation(),
                this.cuboidModel.ft.points[0], this.cuboidModel.vpl));
            this.rtProj.plot(this.updateProjectionLine(this.cuboidModel.rt.getEquation(),
                this.cuboidModel.rt.points[1], this.cuboidModel.vpr));
            this.rbProj.plot(this.updateProjectionLine(this.cuboidModel.rb.getEquation(),
                this.cuboidModel.rt.points[1], this.cuboidModel.vpr));
        },

        updateGrabPoints() {
            const centers = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < centers.length; i += 1) {
                const edge = edges[i];
                centers[i].center(edge.cx(), edge.cy());
            }
        },

        addDragEvents() {
            this.face.draggable().on('dragstart', (e: CustomEvent) => {
                this.dragPoint = { x: e.detail.p.x,
                                   y: e.detail.p.y};
                this.fire('dragstart', e.detail);
            }).on('dragmove', (e: CustomEvent) => {
                this.dmove(e.detail.p.x - this.dragPoint.x,
                           e.detail.p.y - this.dragPoint.y);
                this.dragPoint = { x: e.detail.p.x,
                                   y: e.detail.p.y }
                this.fire('dragmove', e.detail);
            }).on('dragend', (e: CustomEvent) => {
                this.fire('dragend', e.detail);
            });

            const faces = [this.right, this.dorsal, this.left];
            faces.forEach((face: any, i: number) => {
                face.draggable().on('dragstart', (e: CustomEvent) => {
                    this.dragPoint = { x: e.detail.p.x,
                                       y: e.detail.p.y};
                    this.fire('dragstart', e.detail);
                }).on('dragmove', (e: CustomEvent) => {
                    this.cuboidModel.facesList[i+1].points.forEach((point: Point) => {
                        point.x += e.detail.p.x - this.dragPoint.x;
                        point.y += e.detail.p.y - this.dragPoint.y;
                    });
                    this.dragPoint = { x: e.detail.p.x,
                                       y: e.detail.p.y };

                    this.updateViewAndVM();
                    this.fire('dragmove', e.detail);
                }).on('dragend', (e: CustomEvent) => {
                    this.fire('dragend', e.detail);
                });
            });
        },

        removeDragEvents() {
            const faces = [this.face, this.right, this.dorsal, this.left]
            faces.forEach((face: any) => {
                face.draggable(false);
                face.off('dragstart');
                face.off('dragmove');
                face.off('dragsend');
            })
        },

        draggable(value: any, constraint: any) {
            const _draggable = SVG.Element.prototype.draggable.bind(this)
            if (value !== false) {
                this.addDragEvents();
            } else {
                this.removeDragEvents();
            }
            return _draggable(value, constraint);
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

            // to correct getting of points in resizedone, dragdone
            this.attr('points', this.cuboidModel
                .getPoints()
                .reduce((acc: string, point: Point): string => `${acc} ${point.x},${point.y}`, '').trim());
        },

        updateFaces() {
            const viewModel = this.cuboidModel;
        
            const frontPoints = viewModel.front.points;
            this.face.resize()
                .resize(frontPoints[2].x - frontPoints[0].x, frontPoints[1].y - frontPoints[0].y)
                .move(frontPoints[0].x, frontPoints[0].y);

            this.right.plot(viewModel.right.points);
            this.dorsal.plot(viewModel.dorsal.points);
            this.left.plot(viewModel.left.points);
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
    },
    construct: {
        cube(points: string) {
            return this.put(new (SVG as any).Cube()).constructorMethod(points);
        },
    },
});
