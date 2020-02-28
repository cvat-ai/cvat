/* eslint-disable func-names */
/* eslint-disable no-underscore-dangle */
/* eslint-disable curly */
/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported CuboidModel, CuboidView */

/* global
    SVG:false
    PolylineModel:false
    PolyShapeController:false
    PolyShapeModel:false
    PolyShapeView:false
    ShapeView:false STROKE_WIDTH:false
    AREA_TRESHOLD:false
    POINT_RADIUS:false
    SELECT_POINT_STROKE_WIDTH:false
    convertToArray:false
    convertPlainArrayToActual:false
    intersection:false
*/

const MIN_EDGE_LENGTH = 3;

const orientationEnum = {
    LEFT: 0,
    RIGHT: 1,
};

class Equation {
    constructor(p1, p2) {
        this.a = p1[1] - p2[1];
        this.b = p2[0] - p1[0];
        this.c = this.b * p1[1] + this.a * p1[0];

        const temp = { x: p1[0], y: p1[1] };
        const p1Canvas = window.cvat.translate.points.actualToCanvas([temp])[0];
        this.cCanvas = this.b * p1Canvas.y + this.a * p1Canvas.x;
    }

    // get the line equation in actual coordinates
    getY(x) {
        return (this.c - this.a * x) / this.b;
    }

    // get the line equation in canvas coordinates
    getYCanvas(x) {
        return (this.cCanvas - this.a * x) / this.b;
    }
}

class Figure {
    constructor(indices, Vmodel) {
        this.indices = indices;
        this.viewmodel = Vmodel;
    }

    get points() {
        const points = [];
        for (const index of this.indices) {
            points.push(this.viewmodel.points[`${index}`]);
        }
        return points;
    }

    // sets the point for a given edge, points must be given in
    // array form in the same ordering as the getter
    // if you only need to update a subset of the points,
    // simply put null for the points you want to keep
    set points(newPoints) {
        const oldPoints = this.viewmodel.points;
        for (let i = 0; i < newPoints.length; i += 1) {
            if (newPoints[`${i}`] !== null) {
                oldPoints[this.indices[`${i}`]] = { x: newPoints[`${i}`].x, y: newPoints[`${i}`].y };
            }
        }
    }

    get canvasPoints() {
        let { points } = this;
        points = window.cvat.translate.points.actualToCanvas(points);
        return points;
    }
}

class Edge extends Figure {
    getEquation() {
        let { points } = this;
        points = convertToArray(points);
        return new Equation(points[0], points[1]);
    }
}

class Cuboid2PointViewModel {
    constructor(points, leftFacing) {
        this.points = points;
        this._initEdges();
        this._initFaces();
        this._updateVanishingPoints();
        this.buildBackEdge(leftFacing);
        this.updatePoints();
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
    }

    updatePoints() {
        // making sure that the edges are vertical
        this.fr.points[0].x = this.fr.points[1].x;
        this.fl.points[0].x = this.fl.points[1].x;
        this.dr.points[0].x = this.dr.points[1].x;
        this.dl.points[0].x = this.dl.points[1].x;
    }

    computeSideEdgeConstraints(edge) {
        const midLength = this.fr.canvasPoints[1].y - this.fr.canvasPoints[0].y - 1;

        const minY = edge.canvasPoints[1].y - midLength;
        const maxY = edge.canvasPoints[0].y + midLength;

        const y1 = edge.points[0].y;
        const y2 = edge.points[1].y;

        const miny1 = y2 - midLength;
        const maxy1 = y2 - MIN_EDGE_LENGTH;

        const miny2 = y1 + MIN_EDGE_LENGTH;
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
    _updateVanishingPoints(buildright) {
        let leftEdge = 0;
        let rightEdge = 0;
        let midEdge = 0;
        if (buildright) {
            leftEdge = convertToArray(this.fr.points);
            rightEdge = convertToArray(this.dl.points);
            midEdge = convertToArray(this.fl.points);
        } else {
            leftEdge = convertToArray(this.fl.points);
            rightEdge = convertToArray(this.dr.points);
            midEdge = convertToArray(this.fr.points);
        }

        this.vpl = intersection(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        this.vpr = intersection(rightEdge[0], midEdge[0], rightEdge[1], midEdge[1]);
        if (this.vpl === null) {
            // shift the edge slightly to avoid edge case
            leftEdge[0][1] -= 0.001;
            leftEdge[0][0] += 0.001;
            leftEdge[1][0] += 0.001;
            this.vpl = intersection(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        }
        if (this.vpr === null) {
            // shift the edge slightly to avoid edge case
            rightEdge[0][1] -= 0.001;
            rightEdge[0][0] -= 0.001;
            rightEdge[1][0] -= 0.001;
            this.vpr = intersection(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        }
    }

    _initEdges() {
        this.fl = new Edge([0, 1], this);
        this.fr = new Edge([2, 3], this);
        this.dr = new Edge([4, 5], this);
        this.dl = new Edge([6, 7], this);

        this.ft = new Edge([0, 2], this);
        this.lt = new Edge([0, 6], this);
        this.rt = new Edge([2, 4], this);
        this.dt = new Edge([6, 4], this);

        this.fb = new Edge([1, 3], this);
        this.lb = new Edge([1, 7], this);
        this.rb = new Edge([3, 5], this);
        this.db = new Edge([7, 5], this);

        this.edgeList = [this.fl, this.fr, this.dl, this.dr, this.ft, this.lt,
            this.rt, this.dt, this.fb, this.lb, this.rb, this.db];
    }

    _initFaces() {
        this.front = new Figure([0, 1, 3, 2], this);
        this.right = new Figure([2, 3, 5, 4], this);
        this.dorsal = new Figure([4, 5, 7, 6], this);
        this.left = new Figure([6, 7, 1, 0], this);
        this.top = new Figure([0, 2, 4, 6], this);
        this.bot = new Figure([1, 3, 5, 7], this);

        this.facesList = [this.front, this.right, this.dorsal, this.left];
    }

    buildBackEdge(buildRight) {
        let leftPoints = 0;
        let rightPoints = 0;

        let topIndex = 0;
        let botIndex = 0;

        if (buildRight) {
            this._updateVanishingPoints(true);
            leftPoints = this.dl.points;
            rightPoints = this.fr.points;
            topIndex = 4;
            botIndex = 5;
        } else {
            this._updateVanishingPoints();
            leftPoints = this.dr.points;
            rightPoints = this.fl.points;
            topIndex = 6;
            botIndex = 7;
        }

        const vpLeft = this.vpl;
        const vpRight = this.vpr;

        leftPoints = convertToArray(leftPoints);
        rightPoints = convertToArray(rightPoints);

        let p1 = intersection(vpLeft, leftPoints[0], vpRight, rightPoints[0]);
        let p2 = intersection(vpLeft, leftPoints[1], vpRight, rightPoints[1]);

        if (p1 === null) {
            p1 = [p2[0], vpLeft[1]];
        } else if (p2 === null) {
            p2 = [p1[0], vpLeft[1]];
        }

        this.points[`${topIndex}`] = { x: p1[0], y: p1[1] };
        this.points[`${botIndex}`] = { x: p2[0], y: p2[1] };

        // Making sure that the vertical edges stay vertical
        this.updatePoints();
    }

    get vplCanvas() {
        const { vpl } = this;
        const vp = { x: vpl[0], y: vpl[1] };
        return window.cvat.translate.points.actualToCanvas([vp])[0];
    }

    get vprCanvas() {
        const { vpr } = this;
        const vp = { x: vpr[0], y: vpr[1] };
        return window.cvat.translate.points.actualToCanvas([vp])[0];
    }
}


class CuboidController extends PolyShapeController {
    constructor(cuboidModel) {
        super(cuboidModel);
        const frame = window.cvat.player.frames.current;
        const points = PolylineModel.convertStringToNumberArray(
            cuboidModel._interpolatePosition(frame).points,
        );

        this.viewModel = new Cuboid2PointViewModel(points);
        this.orientation = orientationEnum.LEFT;
    }

    setView(cuboidView) {
        this.cuboidView = cuboidView;
    }

    set draggable(value) {
        this._model.draggable = value;
    }

    get draggable() {
        return this._model.draggable;
    }

    addEventsToCube() {
        const controller = this;
        const cuboidview = this.cuboidView;
        const edges = cuboidview._uis.shape.getEdges();
        const grabPoints = cuboidview._uis.shape.getGrabPoints();
        const draggableFaces = [
            cuboidview._uis.shape.left,
            cuboidview._uis.shape.dorsal,
            cuboidview._uis.shape.right,
        ];

        if (this.viewModel.dl.points[0].x > this.viewModel.fl.points[0].x) {
            this.orientation = orientationEnum.LEFT;
        } else {
            this.orientation = orientationEnum.RIGHT;
        }

        this.updateGrabPoints();
        cuboidview._uis.shape.on('mousedown', () => {
            ShapeView.prototype._positionateMenus.call(cuboidview);
        });
        edges.forEach((edge) => {
            edge.on('resizestart', () => {
                cuboidview._flags.resizing = true;
                cuboidview._hideShapeText();
                cuboidview.notify('resize');
            }).on('resizedone', () => {
                cuboidview._flags.resizing = false;
                controller.updateModel();
                controller.updateViewModel();
                cuboidview.notify('resize');
            });
        });
        grabPoints.forEach((grabPoint) => {
            grabPoint.on('dragstart', () => {
                cuboidview._flags.dragging = true;
                cuboidview._hideShapeText();
                cuboidview.notify('drag');
            }).on('dragend', () => {
                cuboidview._flags.dragging = false;
                cuboidview._showShapeText();
                cuboidview.notify('drag');
                controller.updateModel();
                controller.updateViewModel();
            });
        });

        draggableFaces.forEach((face) => {
            face.on('dragstart', () => {
                cuboidview._flags.dragging = true;
                ShapeView.prototype._positionateMenus.call(cuboidview);
                cuboidview._hideShapeText();
                cuboidview.notify('drag');
            }).on('dragend', () => {
                cuboidview._flags.dragging = false;
                cuboidview._showShapeText();
                cuboidview.notify('drag');
                controller.updateModel();
                controller.updateViewModel();
                controller.updateGrabPoints();
            });
        });

        this.makeDraggable();
        this.makeResizable();
    }

    // computes new position of points given an initial position and a current position
    translatePoints(startPoint, startPosition, currentPosition) {
        const dx = currentPosition.x - startPoint.x;
        const dy = currentPosition.y - startPoint.y;
        const newPoints = [];
        for (let i = 0; i < startPosition.length; i += 1) {
            newPoints[`${i}`] = { x: startPosition[`${i}`].x + dx, y: startPosition[`${i}`].y + dy };
        }
        this.viewModel.setPoints(newPoints);
    }

    updateGrabPoints() {
        // if the cuboid is front face is on the left
        const view = this.cuboidView._uis.shape;
        const { viewModel } = this;
        const controller = this;
        if (this.orientation === orientationEnum.LEFT) {
            if (viewModel.dl.points[0].x > viewModel.fl.points[0].x) {
                view.dorsalRightEdge.selectize({
                    points: 't,b',
                    rotationPoint: false,
                }).resize().on('resizing', function (e) {
                    if (e.detail.event.shiftKey) {
                        controller.resizeControl(viewModel.dr,
                            this,
                            viewModel.computeSideEdgeConstraints(viewModel.dr));
                    } else {
                        const midPointUp = convertPlainArrayToActual([view.dorsalRightEdge.attr('x1'), view.dorsalRightEdge.attr('y1')])[0];
                        const midPointDown = convertPlainArrayToActual([view.dorsalRightEdge.attr('x2'), view.dorsalRightEdge.attr('y2')])[0];
                        viewModel.top.points = controller.computeHeightFace(midPointUp, 3);
                        viewModel.bot.points = controller.computeHeightFace(midPointDown, 3);
                    }
                    controller.updateViewAndVM();
                });
                view.drCenter.show();

                view.dorsalLeftEdge.selectize(false);
                view.dlCenter.hide();
                this.orientation = orientationEnum.RIGHT;
            }
        } else if (this.orientation === orientationEnum.RIGHT) {
            if (viewModel.dl.points[0].x <= viewModel.fl.points[0].x) {
                view.dorsalLeftEdge.selectize({
                    points: 't,b',
                    rotationPoint: false,
                }).resize().on('resizing', function (e) {
                    if (e.detail.event.shiftKey) {
                        controller.resizeControl(viewModel.dl,
                            this,
                            viewModel.computeSideEdgeConstraints(viewModel.dl));
                    } else {
                        const midPointUp = convertPlainArrayToActual([view.dorsalLeftEdge.attr('x1'), view.dorsalLeftEdge.attr('y1')])[0];
                        const midPointDown = convertPlainArrayToActual([view.dorsalLeftEdge.attr('x2'), view.dorsalLeftEdge.attr('y2')])[0];
                        viewModel.top.points = controller.computeHeightFace(midPointUp, 4);
                        viewModel.bot.points = controller.computeHeightFace(midPointDown, 4);
                    }
                    controller.updateViewAndVM(true);
                });
                view.dlCenter.show();

                view.dorsalRightEdge.selectize(false);
                view.drCenter.hide();
                this.orientation = orientationEnum.LEFT;
            }
        }
    }

    makeDraggable() {
        const controller = this;
        const { viewModel } = this;
        const view = this.cuboidView._uis.shape;
        let startPoint = null;
        let startPosition = null;

        view.draggable().off('dragend').on('dragstart', (e) => {
            startPoint = e.detail.p;
            startPosition = viewModel.getPoints();
        }).on('dragmove', (e) => {
            e.preventDefault();
            controller.translatePoints(startPoint, startPosition, e.detail.p);
            controller.refreshView();
        })
            .on('dragend', () => {
                controller.updateModel();
                controller.updateViewModel();
            });

        // Controllable vertical edges
        view.flCenter.draggable(function (x) {
            const vpX = this.cx() - viewModel.vplCanvas.x > 0 ? viewModel.vplCanvas.x : 0;
            return { x: x < viewModel.fr.canvasPoints[0].x && x > vpX + MIN_EDGE_LENGTH };
        }).on('dragmove', function () {
            view.frontLeftEdge.center(this.cx(), this.cy());

            const position = convertPlainArrayToActual([view.frontLeftEdge.attr('x1'), view.frontLeftEdge.attr('y1')])[0];
            const { x } = position;

            const y1 = viewModel.ft.getEquation().getY(x);
            const y2 = viewModel.fb.getEquation().getY(x);

            const topPoint = { x, y: y1 };
            const botPoint = { x, y: y2 };

            viewModel.fl.points = [topPoint, botPoint];
            controller.updateViewAndVM();
        });

        view.drCenter.draggable(function (x) {
            let xStatus;
            if (this.cx() < viewModel.fr.canvasPoints[0].x) {
                xStatus = x < viewModel.fr.canvasPoints[0].x - MIN_EDGE_LENGTH
                    && x > viewModel.vprCanvas.x + MIN_EDGE_LENGTH;
            } else {
                xStatus = x > viewModel.fr.canvasPoints[0].x + MIN_EDGE_LENGTH
                    && x < viewModel.vprCanvas.x - MIN_EDGE_LENGTH;
            }
            return { x: xStatus, y: this.attr('y1') };
        }).on('dragmove', function () {
            view.dorsalRightEdge.center(this.cx(), this.cy());

            const position = convertPlainArrayToActual([view.dorsalRightEdge.attr('x1'), view.dorsalRightEdge.attr('y1')])[0];
            const { x } = position;

            const y1 = viewModel.rt.getEquation().getY(x);
            const y2 = viewModel.rb.getEquation().getY(x);

            const topPoint = { x, y: y1 };
            const botPoint = { x, y: y2 };

            viewModel.dr.points = [topPoint, botPoint];
            controller.updateViewAndVM();
        });

        view.dlCenter.draggable(function (x) {
            let xStatus;
            if (this.cx() < viewModel.fl.canvasPoints[0].x) {
                xStatus = x < viewModel.fl.canvasPoints[0].x - MIN_EDGE_LENGTH
                    && x > viewModel.vprCanvas.x + MIN_EDGE_LENGTH;
            } else {
                xStatus = x > viewModel.fl.canvasPoints[0].x + MIN_EDGE_LENGTH
                    && x < viewModel.vprCanvas.x + MIN_EDGE_LENGTH;
            }
            return { x: xStatus, y: this.attr('y1') };
        }).on('dragmove', function () {
            view.dorsalLeftEdge.center(this.cx(), this.cy());

            const position = convertPlainArrayToActual([view.dorsalLeftEdge.attr('x1'), view.dorsalLeftEdge.attr('y1')])[0];
            const { x } = position;

            const y1 = viewModel.lt.getEquation().getY(x);
            const y2 = viewModel.lb.getEquation().getY(x);

            const topPoint = { x, y: y1 };
            const botPoint = { x, y: y2 };

            viewModel.dl.points = [topPoint, botPoint];
            controller.updateViewAndVM(true);
        });

        view.frCenter.draggable(function (x) {
            return { x: x > viewModel.fl.canvasPoints[0].x, y: this.attr('y1') };
        }).on('dragmove', function () {
            view.frontRightEdge.center(this.cx(), this.cy());

            const position = convertPlainArrayToActual([view.frontRightEdge.attr('x1'), view.frontRightEdge.attr('y1')])[0];
            const { x } = position;

            const y1 = viewModel.ft.getEquation().getY(x);
            const y2 = viewModel.fb.getEquation().getY(x);

            const topPoint = { x, y: y1 };
            const botPoint = { x, y: y2 };

            viewModel.fr.points = [topPoint, botPoint];
            controller.updateViewAndVM(true);
        });


        // Controllable 'horizontal' edges
        view.ftCenter.draggable(function (x, y) {
            return { x: x === this.cx(), y: y < view.fbCenter.cy() - MIN_EDGE_LENGTH };
        }).on('dragmove', function () {
            view.frontTopEdge.center(this.cx(), this.cy());
            controller.horizontalEdgeControl(viewModel.top, view.frontTopEdge.attr('x2'), view.frontTopEdge.attr('y2'));
            controller.updateViewAndVM();
        });

        view.fbCenter.draggable(function (x, y) {
            return { x: x === this.cx(), y: y > view.ftCenter.cy() + MIN_EDGE_LENGTH };
        }).on('dragmove', function () {
            view.frontBotEdge.center(this.cx(), this.cy());
            controller.horizontalEdgeControl(viewModel.bot, view.frontBotEdge.attr('x2'), view.frontBotEdge.attr('y2'));
            controller.updateViewAndVM();
        });

        // Controllable faces
        view.left.draggable((x, y) => ({ x: x < Math.min(viewModel.dr.canvasPoints[0].x, viewModel.fr.canvasPoints[0].x) - MIN_EDGE_LENGTH, y })).on('dragmove', function () {
            controller.faceDragControl(viewModel.left, this.attr('points'));
        });
        view.dorsal.draggable().on('dragmove', function () {
            controller.faceDragControl(viewModel.dorsal, this.attr('points'));
        });
        view.right.draggable((x, y) => ({ x: x > Math.min(viewModel.dl.canvasPoints[0].x, viewModel.fl.canvasPoints[0].x) + MIN_EDGE_LENGTH, y })).on('dragmove', function () {
            controller.faceDragControl(viewModel.right, this.attr('points'), true);
        });
    }

    // Drag controls for the faces
    faceDragControl(face, points, buildright) {
        points = window.cvat.translate.points.canvasToActual(points);
        points = PolylineModel.convertStringToNumberArray(points);
        face.points = points;

        this.updateViewAndVM(buildright);
    }

    // Drag controls for the non-vertical edges
    horizontalEdgeControl(updatingFace, midX, midY) {
        const midPoints = convertPlainArrayToActual([midX, midY])[0];
        const leftPoints = this.updatedEdge(
            this.viewModel.fl.points[0],
            midPoints,
            this.viewModel.vpl,
        );
        const rightPoints = this.updatedEdge(
            this.viewModel.dr.points[0],
            midPoints,
            this.viewModel.vpr,
        );

        updatingFace.points = [leftPoints, midPoints, rightPoints, null];
    }

    makeResizable() {
        const controller = this;
        const view = this.cuboidView._uis.shape;
        const { viewModel } = this;
        view.frontLeftEdge.selectize({
            points: 't,b',
            rotationPoint: false,
        }).resize().on('resizing', (e) => {
            if(!e.detail.event.shiftKey){
                const midPointUp = convertPlainArrayToActual([view.frontLeftEdge.attr('x1'), view.frontLeftEdge.attr('y1')])[0];
                const midPointDown = convertPlainArrayToActual([view.frontLeftEdge.attr('x2'), view.frontLeftEdge.attr('y2')])[0];
                viewModel.top.points = this.computeHeightFace(midPointUp, 1);
                viewModel.bot.points = this.computeHeightFace(midPointDown, 1);
                controller.updateViewAndVM();
            }

        }).on('resizestart', (e) =>{
            if (e.detail.event.detail.event.shiftKey) {
                showMessage('Perspective may not be adjusted on pink faces.');
            }
        });

        view.frontRightEdge.selectize({
            points: 't,b',
            rotationPoint: false,
        }).resize().on('resizing', (e) => {
            if(!e.detail.event.shiftKey) {
                const midPointUp = convertPlainArrayToActual([view.frontRightEdge.attr('x1'), view.frontRightEdge.attr('y1')])[0];
                const midPointDown = convertPlainArrayToActual([view.frontRightEdge.attr('x2'), view.frontRightEdge.attr('y2')])[0];
                viewModel.top.points = this.computeHeightFace(midPointUp, 2);
                viewModel.bot.points = this.computeHeightFace(midPointDown, 2);
                controller.updateViewAndVM();
            }
        }).on('resizestart', (e) =>{
            if (e.detail.event.detail.event.shiftKey) {
                showMessage('Perspective may not be adjusted on pink faces.');
            }
        });
    }

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
    }

    resizeControl(vmEdge, updatedEdge, constraints) {
        const topPoint = convertPlainArrayToActual([updatedEdge.attr('x1'), updatedEdge.attr('y1')])[0];
        const botPoint = convertPlainArrayToActual([updatedEdge.attr('x2'), updatedEdge.attr('y2')])[0];

        topPoint.y = Math.clamp(topPoint.y, constraints.y1Range.min, constraints.y1Range.max);
        botPoint.y = Math.clamp(botPoint.y, constraints.y2Range.min, constraints.y2Range.max);

        vmEdge.points = [topPoint, botPoint];
    }

    // This functions resest the perspective of the cuboid by
    // making the top face parallel with the bottom face.
    resetPerspective(){
        if(this.orientation === orientationEnum.RIGHT){
            const edgePoints = this.viewModel.dr.points;
            const constraints = this.viewModel.computeSideEdgeConstraints(this.viewModel.dr);
            edgePoints[0].y = constraints.y1Range.min;
            this.viewModel.dr.points = [edgePoints[0],edgePoints[1]]
            this.updateViewAndVM()
        }else{
            const edgePoints = this.viewModel.dl.points;
            const constraints = this.viewModel.computeSideEdgeConstraints(this.viewModel.dl);
            edgePoints[0].y = constraints.y1Range.min;
            this.viewModel.dl.points = [edgePoints[0],edgePoints[1]]
            this.updateViewAndVM(true)
        }
    }

    // This method switches the pink face of the cuboid between
    // the 2 visible faces
    switch_orientation(){
        function rotate( array , times ){
            if(times>0){
                while( times-- ){
                    var temp = array.shift();
                    array.push( temp );
                }
            }else{
                while(times<0){
                    array.unshift(array.pop());
                    times++;
                }
            }
        }
        this.resetPerspective();

        let top = this.viewModel.top.points;
        let bot =  this.viewModel.bot.points;
        if(this.orientation === orientationEnum.RIGHT){
            rotate(top,1);
            rotate(bot, 1);
        }else{
            rotate(top,-1);
            rotate(bot, -1);
        }
        this.viewModel.top.points = top;
        this.viewModel.bot.points = bot;
        this.updateViewAndVM();
        this.updateGrabPoints();

    }

    // updates the view model with the actual position of the points on screen
    // for the case where points are updated when updating the model
    updateViewModel() {
        let { points } = this._model._interpolatePosition(window.cvat.player.frames.current);
        points = PolylineModel.convertStringToNumberArray(points);
        this.viewModel.setPoints(points);
        this.viewModel.updatePoints();
    }

    // refreshes the view and updates the viewmodel
    updateViewAndVM(build) {
        this.viewModel.buildBackEdge(build);
        this.refreshView();
    }

    // given a point on an edge and a vanishing point,
    // returns the new position of a target point
    updatedEdge(target, base, pivot) {
        const targetX = target.x;
        const line = new Equation(pivot,
            [base.x, base.y]);
        const newY = line.getY(targetX);
        return { x: targetX, y: newY };
    }

    // updates the model with the viewModel points
    updateModel() {
        const frame = window.cvat.player.frames.current;
        const position = this._model._interpolatePosition(frame);

        const viewModelpoints = this.viewModel.getPoints();
        position.points = PolylineModel.convertNumberArrayToString(viewModelpoints);

        this.updatePosition(frame, position);
    }

    refreshView() {
        this.cuboidView._uis.shape.updateView(this.viewModel);
    }

    static removeEventsFromCube(view) {
        const edges = view.getEdges();
        const grabPoints = view.getGrabPoints();
        view.off('dragmove').off('dragend').off('dragstart').off('mousedown');
        for (let i = 0; i < edges.length; i += 1) {
            CuboidController.removeEventsFromElement(edges[`${i}`]);
        }
        grabPoints.forEach((grabPoint) => {
            CuboidController.removeEventsFromElement(grabPoint);
        });

        view.frontLeftEdge.selectize(false);
        view.frontRightEdge.selectize(false);
        view.dorsalRightEdge.selectize(false);
        view.dorsalLeftEdge.selectize(false);

        view.dorsal.off();
        view.left.off();
        view.right.off();
    }

    static removeEventsFromElement(edge) {
        edge.off().draggable(false);
    }
}

class CuboidModel extends PolyShapeModel {
    constructor(data, type, cliendID, color) {
        super(data, type, cliendID, color);
        this._minPoints = 6;
        this._clipToFrame = false;
    }

    static isWithinFrame(points) {
        // Ensure at least one point is within the frame
        const { frameWidth, frameHeight } = window.cvat.player.geometry;
        return points.some((point) => point.x >= 0
            && point.x <= frameWidth
            && point.y >= 0
            && point.y <= frameHeight);
    }

    _verifyArea(box) {
        const withinFrame = CuboidModel.isWithinFrame([
            { x: box.xtl, y: box.ytl },
            { x: box.xbr, y: box.ytl },
            { x: box.xtl, y: box.ybr },
            { x: box.xbr, y: box.ybr },
        ]);
        return withinFrame && ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= AREA_TRESHOLD);
    }

    contain(mousePos, frame) {
        function isLeft(P0, P1, P2) {
            return ((P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y));
        }

        const pos = this._interpolatePosition(frame);
        if (pos.outside) return false;
        let points = PolyShapeModel.convertStringToNumberArray(pos.points);
        points = this.makeHull(points);
        let wn = 0;
        for (let i = 0; i < points.length; i += 1) {
            const p1 = points[`${i}`];
            const p2 = points[i + 1] || points[0];

            if (p1.y <= mousePos.y) {
                if (p2.y > mousePos.y) {
                    if (isLeft(p1, p2, mousePos) > 0) {
                        wn += 1;
                    }
                }
            } else if (p2.y < mousePos.y) {
                if (isLeft(p1, p2, mousePos) < 0) {
                    wn -= 1;
                }
            }
        }

        return wn !== 0;
    }

    makeHull(geoPoints) {
        // Returns the convex hull, assuming that each points[i] <= points[i + 1].
        function makeHullPresorted(points) {
            if (points.length <= 1) return points.slice();

            // Andrew's monotone chain algorithm. Positive y coordinates correspond to 'up'
            // as per the mathematical convention, instead of 'down' as per the computer
            // graphics convention. This doesn't affect the correctness of the result.

            const upperHull = [];
            for (let i = 0; i < points.length; i += 1) {
                const p = points[`${i}`];
                while (upperHull.length >= 2) {
                    const q = upperHull[upperHull.length - 1];
                    const r = upperHull[upperHull.length - 2];
                    if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) upperHull.pop();
                    else break;
                }
                upperHull.push(p);
            }
            upperHull.pop();

            const lowerHull = [];
            for (let i = points.length - 1; i >= 0; i -= 1) {
                const p = points[`${i}`];
                while (lowerHull.length >= 2) {
                    const q = lowerHull[lowerHull.length - 1];
                    const r = lowerHull[lowerHull.length - 2];
                    if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) lowerHull.pop();
                    else break;
                }
                lowerHull.push(p);
            }
            lowerHull.pop();

            if (upperHull.length
                === 1 && lowerHull.length
                === 1 && upperHull[0].x
                === lowerHull[0].x && upperHull[0].y
                === lowerHull[0].y) return upperHull;
            return upperHull.concat(lowerHull);
        }

        function POINT_COMPARATOR(a, b) {
            if (a.x < b.x) return -1;
            if (a.x > b.x) return +1;
            if (a.y < b.y) return -1;
            if (a.y > b.y) return +1;
            return 0;
        }

        const newPoints = geoPoints.slice();
        newPoints.sort(POINT_COMPARATOR);
        return makeHullPresorted(newPoints);
    }

    distance(mousePos, frame) {
        const pos = this._interpolatePosition(frame);
        if (pos.outside) return Number.MAX_SAFE_INTEGER;
        const points = PolyShapeModel.convertStringToNumberArray(pos.points);
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < points.length; i += 1) {
            const p1 = points[`${i}`];
            const p2 = points[i + 1] || points[0];

            // perpendicular from point to straight length
            const distance = (Math.abs((p2.y - p1.y) * mousePos.x
                - (p2.x - p1.x) * mousePos.y + p2.x * p1.y - p2.y * p1.x))
                / Math.sqrt(Math.pow(p2.y - p1.y, 2) + Math.pow(p2.x - p1.x, 2));

            // check if perpendicular belongs to the straight segment
            const a = Math.pow(p1.x - mousePos.x, 2) + Math.pow(p1.y - mousePos.y, 2);
            const b = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
            const c = Math.pow(p2.x - mousePos.x, 2) + Math.pow(p2.y - mousePos.y, 2);
            if (distance < minDistance && (a + b - c) >= 0 && (c + b - a) >= 0) {
                minDistance = distance;
            }
        }
        return minDistance;
    }

    resetPerspective(){
        this.notify('perspectiveReset')
    }

    switchOrientation(){
        this.notify('orientation')
    }

    export() {
        const exported = PolyShapeModel.prototype.export.call(this);
        return exported;
    }

    set draggable(value) {
        this._draggable = value;
        this.notify('draggable');
    }

    get draggable() {
        return this._draggable;
    }
}

class CuboidView extends PolyShapeView {
    constructor(cuboidModel, cuboidController, svgContent, UIContent, textsScene) {
        super(cuboidModel, cuboidController, svgContent, UIContent, textsScene);
        this.model = cuboidModel;
        cuboidController.setView(this);
    }

    // runs every time the UI is redrawn
    _drawShapeUI(position) {
        let { points } = position;
        points = PolyShapeModel.convertStringToNumberArray(points);
        const { viewModel } = this.controller();
        viewModel.setPoints(points);

        this._uis.shape = this._scenes.svg.cube(viewModel)
            .fill(this._appearance.colors.shape).attr({
                fill: this._appearance.fill || this._appearance.colors.shape,
                stroke: this._appearance.stroke || this._appearance.colors.shape,
                'stroke-width': STROKE_WIDTH / window.cvat.player.geometry.scale,
                // eslint-disable-next-line
                'z_order' : position.z_order,
                'fill-opacity': this._appearance.fillOpacity,
            }).addClass('shape');
        this._uis.shape.projectionLineEnable = this._appearance.projectionLineEnable;
        this._controller.updateViewModel();
        this._uis.shape.addMouseOverEvents();
        this._uis.shape.paintOrientationLines();
        ShapeView.prototype._drawShapeUI.call(this);
    }

    _deselect() {
        if (this._uis.shape) {
            PolyShapeView.prototype._deselect.call(this);
            this._uis.shape.removeMouseOverEvents();
            this._uis.shape.resetFaceOpacity();
            this._uis.shape.hideProjections();
        }
    }

    _select() {
        if (this._uis.shape) {
            PolyShapeView.prototype._select.call(this);
            if (!this._controller.lock) {
                this._uis.shape.addMouseOverEvents();
                this._uis.shape.showProjections();
            }
        }
    }

    _makeEditable() {
        if (this._uis.shape && !this._controller.lock) {
            ShapeView.prototype._makeEditable.call(this);
            this._uis.shape.selectize(false);
            this._uis.shape.showGrabPoints();
            this._controller.addEventsToCube();
            const scaledR = POINT_RADIUS / window.cvat.player.geometry.scale;
            const scaledPointStroke = SELECT_POINT_STROKE_WIDTH / window.cvat.player.geometry.scale;
            $('.svg_select_points').each(function () {
                this.instance.radius(scaledR);
                this.instance.attr('stroke-width', scaledPointStroke);
            });
        }
    }

    _setupOccludedUI(occluded) {
        if (occluded) {
            this._uis.shape.addOccluded();
        } else {
            this._uis.shape.removeOccluded();
        }
    }

    _makeNotEditable() {
        if (this._uis.shape && this._flags.editable) {
            CuboidController.removeEventsFromCube(this._uis.shape);
            this._uis.shape.hideGrabPoints();

            PolyShapeView.prototype._makeNotEditable.call(this);
        }
    }

    updateColorSettings(settings) {
        ShapeView.prototype.updateColorSettings.call(this, settings);
        if (this._uis.shape) {
            this._appearance.projectionLineEnable = settings['projection-lines'];
            this.switchProjectionLine(settings['projection-lines']);
            this._uis.shape.paintOrientationLines();
        }
    }

    onShapeUpdate(model) {
        ShapeView.prototype.onShapeUpdate.call(this, model);
        if (model.updateReason === 'perspectiveReset') {
            this._controller.resetPerspective();
        }else if(model.updateReason === 'orientation'){
            this._controller.switch_orientation();
        }
    }

    updateShapeTextPosition() {
        super.updateShapeTextPosition();
    }

    switchProjectionLine(enable) {
        this._uis.shape.projectionLineEnable = enable;
    }
}

// Definition of the svg object
SVG.Cube = SVG.invent({
    create: 'g',
    inherit: SVG.G,
    extend: {

        constructorMethod(viewModel) {
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

        updateGrabPoints() {
            const centers = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < centers.length; i += 1) {
                const edge = edges[`${i}`];
                centers[`${i}`].center(edge.cx(), edge.cy());
            }
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

        showGrabPoints() {
            const grabPoints = this.getGrabPoints();
            grabPoints.forEach((point) => {
                point.show();
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
