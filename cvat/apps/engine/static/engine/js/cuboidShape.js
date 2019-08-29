/* exported CuboidModel, CuboidView */

/* global
    math:false
    SVG:false
    PolylineModel:false
    PolyShapeController:false
    PolyShapeModel:false
    PolyShapeView:false
    ShapeView:false
    STROKE_WIDTH:false
    AREA_TRESHOLD:false
*/

class CuboidController extends PolyShapeController {
    constructor(cuboidModel) {
        super(cuboidModel);
        const frame = window.cvat.player.frames.current;
        const points = PolylineModel.convertStringToNumberArray(cuboidModel._interpolatePosition(frame).points);
        this.viewModel = new Cuboid2PointViewModel(points);
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

    updateViewModel() {
        let { points } = this._model._interpolatePosition(window.cvat.player.frames.current);
        points = PolylineModel.convertStringToNumberArray(points);
        this.viewModel.setPoints(points);
        this.viewModel.updatePoints();
    }

    updatePointsByIndex(face) {
        const newPoints = this.viewModel.getPoints();
        face.forEach((point) => {
            newPoints[point.index] = { x: point.x, y: point.y };
        });
        this.viewModel.setPoints(newPoints);
    }

    addEventsToCube() {
        const controller = this;
        const cuboidview = this.cuboidView;
        const edges = cuboidview._uis.shape.getEdges();

        cuboidview._uis.shape.on('mousedown', () => {
            ShapeView.prototype._positionateMenus.call(cuboidview);
        });
        edges.forEach((edge) => {
            edge.on('dragstart', () => {
                cuboidview._flags.dragging = true;
                cuboidview._hideShapeText();
                cuboidview.notify('drag');
            }).on('dragend', () => {
                cuboidview._flags.dragging = false;
                cuboidview._showShapeText();
                cuboidview.notify('drag');
                controller.updateModel();
                controller.updateViewModel();
            }).on('resizestart', () => {
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

        cuboidview._uis.shape.left.on('dragstart', () => {
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
        });

        cuboidview._uis.shape.dorsal.on('dragstart', () => {
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
        });

        this.makeDraggable();
        this.makeResizable();
    }

    translatePoints(startPoint, startPosition, currentPosition) {
        const dx = currentPosition.x - startPoint.x;
        const dy = currentPosition.y - startPoint.y;
        const newPoints = [];
        for (let i = 0; i < startPosition.length; i++) {
            newPoints[i] = { x: startPosition[i].x + dx, y: startPosition[i].y + dy };
        }
        this.viewModel.setPoints(newPoints);
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

        view.front_left_edge.draggable(function (x) {
            return { x, y: this.attr('y1') };
        }).on('dragmove', function () {
            const position = CuboidController.convertPlainArrayToActual([this.attr('x1'), this.attr('y1')])[0];
            const { x } = position;

            const y1 = viewModel.ft.getEquation().getY(x);
            const y2 = viewModel.fb.getEquation().getY(x);

            const top_point = { x, y: y1 };
            const bot_point = { x, y: y2 };

            top_point.index = 0;
            bot_point.index = 1;

            const points_array = [top_point, bot_point];
            const indices_array = [0, 1];
            controller.updateViewAndVM(points_array, indices_array);
        });

        view.dorsal_right_edge.draggable(function (x) {
            return { x, y: this.attr('y1') };
        }).on('dragmove', function () {
            const position = CuboidController.convertPlainArrayToActual([this.attr('x1'), this.attr('y1')])[0];
            const { x } = position;

            const y1 = viewModel.rt.getEquation().getY(x);
            const y2 = viewModel.rb.getEquation().getY(x);

            const top_point = { x, y: y1 };
            const bot_point = { x, y: y2 };

            const points_array = [top_point, bot_point];
            const indices_array = [4, 5];
            controller.updateViewAndVM(points_array, indices_array);
        });

        view.front_top_edge.draggable(function (x, y) {
            return { x: this.attr('x1'), y };
        }).on('dragmove', function () {
            const midPoints = CuboidController.convertPlainArrayToActual([this.attr('x2'), this.attr('y2')])[0];

            const newPoints = controller.edgeIntersections(midPoints);

            const leftPoints = newPoints[0];
            const rightPoints = newPoints[1];

            const points_array = [leftPoints, midPoints, rightPoints];
            const indices_array = [0, 2, 4];
            controller.updateViewAndVM(points_array, indices_array);
        });

        view.right_top_edge.draggable(function (x, y) {
            return { x: this.attr('x1'), y };
        }).on('dragmove', function () {
            const midPoints = CuboidController.convertPlainArrayToActual([this.attr('x1'), this.attr('y1')])[0];

            const newPoints = controller.edgeIntersections(midPoints);

            const leftPoints = newPoints[0];
            const rightPoints = newPoints[1];

            const points_array = [leftPoints, midPoints, rightPoints];
            const indices_array = [0, 2, 4];
            controller.updateViewAndVM(points_array, indices_array);
        });
        view.front_bot_edge.draggable(function (x, y) {
            return { x: this.attr('x1'), y };
        }).on('dragmove', function () {
            const midPoints = CuboidController.convertPlainArrayToActual([this.attr('x2'), this.attr('y2')])[0];

            const newPoints = controller.edgeIntersections(midPoints);

            const leftPoints = newPoints[0];
            const rightPoints = newPoints[1];

            const points_array = [leftPoints, midPoints, rightPoints];
            const indices_array = [1, 3, 5];
            controller.updateViewAndVM(points_array, indices_array);
        });

        view.right_bot_edge.draggable(function (x, y) {
            return { x: this.attr('x1'), y };
        }).on('dragmove', function () {
            const midPoints = CuboidController.convertPlainArrayToActual([this.attr('x1'), this.attr('y1')])[0];

            const newPoints = controller.edgeIntersections(midPoints);

            const leftPoints = newPoints[0];
            const rightPoints = newPoints[1];

            const points_array = [leftPoints, midPoints, rightPoints];
            const indices_array = [1, 3, 5];
            controller.updateViewAndVM(points_array, indices_array);
        });
        view.left.draggable().on('dragmove', function () {
            let points = this.attr('points');
            points = window.cvat.translate.points.canvasToActual(points);
            points = PolylineModel.convertStringToNumberArray(points);

            const p0 = points[2];
            const p1 = points[3];

            const points_array = [p0, p1];
            const indices_array = [1, 0];
            controller.updateViewAndVM(points_array, indices_array);
        });
        view.dorsal.draggable().on('dragmove', function () {
            let points = this.attr('points');
            points = window.cvat.translate.points.canvasToActual(points);
            points = PolylineModel.convertStringToNumberArray(points);

            const p0 = points[0];
            const p1 = points[1];

            const points_array = [p0, p1];
            const indices_array = [4, 5];
            controller.updateViewAndVM(points_array, indices_array);
        });
    }

    makeResizable() {
        const controller = this;
        const view = this.cuboidView._uis.shape;

        view.front_left_edge.selectize({
            points: 't,b',
            rotationPoint: false,
        }).resize().on('resizing', function () {
            const top_point = CuboidController.convertPlainArrayToActual([this.attr('x1'), this.attr('y1')])[0];
            const bot_point = CuboidController.convertPlainArrayToActual([this.attr('x2'), this.attr('y2')])[0];

            const points_array = [top_point, bot_point];
            const indices_array = [0, 1];
            controller.updateViewAndVM(points_array, indices_array);
        });

        view.front_right_edge.selectize({
            points: 't,b',
            rotationPoint: false,
        }).resize().on('resizing', function () {
            const top_point = CuboidController.convertPlainArrayToActual([this.attr('x1'), this.attr('y1')])[0];
            const bot_point = CuboidController.convertPlainArrayToActual([this.attr('x2'), this.attr('y2')])[0];

            const points_array = [top_point, bot_point];
            const indices_array = [2, 3];
            controller.updateViewAndVM(points_array, indices_array);
        });


        view.dorsal_right_edge.selectize({
            points: 't,b',
            rotationPoint: false,
        }).resize().on('resizing', function () {
            const top_point = CuboidController.convertPlainArrayToActual([this.attr('x1'), this.attr('y1')])[0];
            const bot_point = CuboidController.convertPlainArrayToActual([this.attr('x2'), this.attr('y2')])[0];

            const points_array = [top_point, bot_point];
            const indices_array = [4, 5];
            controller.updateViewAndVM(points_array, indices_array);
        });
    }

    updateViewAndVM(pointsArray, indicesArray) {
        for (let i = 0; i < pointsArray.length; i++) {
            pointsArray[i].index = indicesArray[i];
        }
        this.updatePointsByIndex(pointsArray);
        this.viewModel.buildBackEdge();
        this.refreshView(this.cuboidView._uis.shape);
    }

    // Given a midpoint of the cuboid, calculates where the left and right point should fall using the vanishing points
    edgeIntersections(midPoint) {
        const left_x = this.viewModel.fl.points[0].x;
        const right_x = this.viewModel.dr.points[0].x;

        const tlf_line = CuboidController.createEquation(this.viewModel.vpl, [midPoint.x, midPoint.y]);
        const trf_line = CuboidController.createEquation(this.viewModel.vpr, [midPoint.x, midPoint.y]);

        const left_y1 = tlf_line.getY(left_x);
        const right_y1 = trf_line.getY(right_x);

        const left_point = { x: left_x, y: left_y1 };
        const right_point = { x: right_x, y: right_y1 };

        return [left_point, right_point];
    }

    static removeEventsFromCube(view) {
        const edges = view.getEdges();
        view.off('dragmove').off('dragend').off('dragstart').off('mousedown');
        for (let i = 0; i < edges.length; i++) {
            CuboidController.removeEventsFromEdge(edges[i]);
        }
        view.front_left_edge.selectize(false);
        view.front_right_edge.selectize(false);
        view.dorsal_right_edge.selectize(false);

        view.dorsal.off();
        view.left.off();
    }

    static removeEventsFromEdge(edge) {
        edge.off().draggable(false);
    }

    updateModel() {
        const frame = window.cvat.player.frames.current;
        const position = this._model._interpolatePosition(frame);

        const viewModelpoints = this.viewModel.getPoints();

        this.viewModel.sortEdges();

        position.points = PolylineModel.convertNumberArrayToString(viewModelpoints);

        this.updatePosition(frame, position);
    }


    refreshView() {
        this.cuboidView._uis.shape.updateView(this.viewModel);
    }

    static createEquation(p1, p2) {
        return new Equation(p1, p2);
    }

    static convertPlainArrayToActual(arr) {
        let actual = [{ x: arr[0], y: arr[1] }];
        actual = PolylineModel.convertNumberArrayToString(actual);
        actual = window.cvat.translate.points.canvasToActual(actual);
        actual = PolylineModel.convertStringToNumberArray(actual);
        return actual;
    }
}

class CuboidModel extends PolyShapeModel {
    constructor(data, type, cliendID, color) {
        super(data, type, cliendID, color);
        this._minPoints = 6;
    }

    _verifyArea(box) {
        return ((box.xbr - box.xtl) * (box.ybr - box.ytl) >= AREA_TRESHOLD);
    }

    contain(mousePos, frame) {
        const pos = this._interpolatePosition(frame);
        if (pos.outside) return false;
        let points = PolyShapeModel.convertStringToNumberArray(pos.points);
        points = this.makeHull(points);
        let wn = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
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

        function isLeft(P0, P1, P2) {
            return ((P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y));
        }
    }

    makeHull(geoPoints) {
        const newPoints = geoPoints.slice();
        newPoints.sort(POINT_COMPARATOR);
        return makeHullPresorted(newPoints);

        // Returns the convex hull, assuming that each points[i] <= points[i + 1]. Runs in O(n) time.
        function makeHullPresorted(points) {
            if (points.length <= 1) return points.slice();

            // Andrew's monotone chain algorithm. Positive y coordinates correspond to "up"
            // as per the mathematical convention, instead of "down" as per the computer
            // graphics convention. This doesn't affect the correctness of the result.

            const upperHull = [];
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
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
            for (let i = points.length - 1; i >= 0; i--) {
                const p = points[i];
                while (lowerHull.length >= 2) {
                    const q = lowerHull[lowerHull.length - 1];
                    const r = lowerHull[lowerHull.length - 2];
                    if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) lowerHull.pop();
                    else break;
                }
                lowerHull.push(p);
            }
            lowerHull.pop();

            if (upperHull.length === 1 && lowerHull.length === 1 && upperHull[0].x === lowerHull[0].x && upperHull[0].y === lowerHull[0].y) return upperHull;
            return upperHull.concat(lowerHull);
        }

        function POINT_COMPARATOR(a, b) {
            if (a.x < b.x) return -1;
            if (a.x > b.x) return +1;
            if (a.y < b.y) return -1;
            if (a.y > b.y) return +1;
            return 0;
        }
    }

    distance(mousePos, frame) {
        const pos = this._interpolatePosition(frame);
        if (pos.outside) return Number.MAX_SAFE_INTEGER;
        const points = PolyShapeModel.convertStringToNumberArray(pos.points);
        let minDistance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[i + 1] || points[0];

            // perpendicular from point to straight length
            const distance = (Math.abs((p2.y - p1.y) * mousePos.x - (p2.x - p1.x) * mousePos.y + p2.x * p1.y - p2.y * p1.x))
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

class Equation {
    constructor(p1, p2) {
        this.a = p1[1] - p2[1];
        this.b = p2[0] - p1[0];
        this.c = this.b * p1[1] + this.a * p1[0];

        const temp = { x: p1[0], y: p1[1] };
        const p1_canvas = window.cvat.translate.points.actualToCanvas([temp])[0];
        this.c_canvas = this.b * p1_canvas.y + this.a * p1_canvas.x;
    }

    getY(x) {
        return (this.c - this.a * x) / this.b;
    }

    getYCanvas(x) {
        return (this.c_canvas - this.a * x) / this.b;
    }
}

class BaseCuboidViewModel {
    constructor(points) {
        this.points = points;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
    }

    static convertToArray(points) {
        const arr = [];
        points.forEach((point) => {
            arr.push([point.x, point.y]);
        });
        return arr;
    }
}

class Cuboid2PointViewModel extends BaseCuboidViewModel {
    constructor(points) {
        super(points);
        this._Edges();
        this._Faces();
        this.topIsClockwise = false;
        this.botIsClockwise = false;
        this.updatePoints();
        this.buildBackEdge();
        this._updateRotations();
    }

    updatePoints() {
        this._updateVanishingPoints();
    }

    _updateRotations() {
        const rotations = this._getRotations();
        this.topIsClockwise = rotations.topRotation;
        this.botIsClockwise = rotations.botRotation;
    }

    _updateVanishingPoints() {
        const leftEdge = BaseCuboidViewModel.convertToArray(this.fl.points);
        const rightEdge = BaseCuboidViewModel.convertToArray(this.dr.points);
        const midEdge = BaseCuboidViewModel.convertToArray(this.fr.points);

        this.vpl = math.intersect(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        this.vpr = math.intersect(rightEdge[0], midEdge[0], rightEdge[1], midEdge[1]);
        if (this.vpl === null) {
            // shift the edge slightly to avoid edge case
            leftEdge[0][1] -= 0.001;
            leftEdge[0][0] += 0.001;
            leftEdge[1][0] += 0.001;
            this.vpl = math.intersect(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        }
        if (this.vpr === null) {
            // shift the edge slightly to avoid edge case
            rightEdge[0][1] -= 0.001;
            rightEdge[0][0] -= 0.001;
            rightEdge[1][0] -= 0.001;
            this.vpr = math.intersect(leftEdge[0], midEdge[0], leftEdge[1], midEdge[1]);
        }
    }

    // calculates if the polygon formed by the top points and bottom points are ordered in
    // clockwise or anticlockwise manner
    _getRotations() {
        const top_points = [this.points[0], this.points[2], this.points[4], this.points[6]];
        const bot_points = [this.points[1], this.points[3], this.points[5], this.points[7]];
        return { topRotation: this._isClockwise(top_points), botRotation: this._isClockwise(bot_points) };
    }

    sortEdges() {
        const rotations = this._getRotations();

        if (this._isFlipped(this.fl)) {
            swap(0, 1, this.points);
            swap(2, 3, this.points);
            swap(4, 5, this.points);
            swap(6, 7, this.points);
        }

        if (rotations.botRotation !== this.botIsClockwise && rotations.topRotation !== this.topIsClockwise) {
            swap(0, 6, this.points);
            swap(1, 7, this.points);
            swap(2, 4, this.points);
            swap(3, 5, this.points);
        }

        // getting the top points only, by taking every second point
        const filteredPoints = this.points.filter((value, index) => (index % 2 === 0));
        const min_x = filteredPoints.reduce((min, p) => (p.x < min ? p.x : min), filteredPoints[0].x);
        while (this.points[0].x !== min_x) {
            rotate(-2, this.points);
        }

        this._updateRotations();

        function swap(a, b, arr) {
            [arr[a], arr[b]] = [arr[b], arr[a]];
        }

        function rotate(count, array) {
            const len = array.length;
            // convert count to value in range [0, len)
            count = ((count % len) + len) % len;
            // use splice.call() instead of this.splice() to make function generic
            Array.prototype.push.apply(array, Array.prototype.splice.call(array, 0, count));
            return array;
        }
    }

    _isFlipped(edge) {
        return edge.points[0].y > edge.points[1].y;
    }

    // determines if a list of points are in clockwise order
    _isClockwise(points) {
        let sum = 0;
        const len = points.length;
        for (let i = 0; i < len; i++) {
            sum += (points[(i + 1) % len].x - points[i].x) * (points[(i + 1) % len].y + points[i].y);
        }
        return sum < 0;
    }

    _Edges() {
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

        this.edgeList = [];
        this.edgeList.push(this.fl);
        this.edgeList.push(this.fr);
        this.edgeList.push(this.dl);
        this.edgeList.push(this.dr);
        this.edgeList.push(this.ft);
        this.edgeList.push(this.lt);
        this.edgeList.push(this.rt);
        this.edgeList.push(this.dt);
        this.edgeList.push(this.fb);
        this.edgeList.push(this.lb);
        this.edgeList.push(this.rb);
        this.edgeList.push(this.db);
    }

    _Faces() {
        this.front = new Figure([0, 1, 3, 2], this);
        this.right = new Figure([2, 3, 5, 4], this);
        this.dorsal = new Figure([4, 5, 7, 6], this);
        this.left = new Figure([6, 7, 1, 0], this);

        this.facesList = [];
        this.facesList.push(this.front);
        this.facesList.push(this.right);
        this.facesList.push(this.dorsal);
        this.facesList.push(this.left);
    }

    buildBackEdge() {
        this.updatePoints();
        const vp_left = this.vpl;
        const vp_right = this.vpr;

        let leftPoints = this.dr.points;
        let rightPoints = this.fl.points;

        leftPoints = BaseCuboidViewModel.convertToArray(leftPoints);
        rightPoints = BaseCuboidViewModel.convertToArray(rightPoints);

        let p1 = math.intersect(vp_left, leftPoints[0], vp_right, rightPoints[0]);
        let p2 = math.intersect(vp_left, leftPoints[1], vp_right, rightPoints[1]);

        if (p1 === null) {
            p1 = [];
            p1[0] = p2[0];
            p1[1] = vp_left[1];
        } else if (p2 === null) {
            p2 = [];
            p2[0] = p1[0];
            p2[1] = vp_left[1];
        }

        this.points[6] = { x: p1[0], y: p1[1] };
        this.points[7] = { x: p2[0], y: p2[1] };
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

class Figure {
    constructor(indices, Vmodel) {
        this.indices = indices;
        this.viewmodel = Vmodel;
    }

    get points() {
        const points = [];
        for (const index of this.indices) {
            points.push(this.viewmodel.points[index]);
        }
        return points;
    }

    set points(value) {
        return 0;
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
        points = BaseCuboidViewModel.convertToArray(points);
        return CuboidController.createEquation(points[0], points[1]);
    }
}

class CuboidView extends PolyShapeView {
    constructor(cuboidModel, cuboidController, svgContent, UIContent, textsScene) {
        super(cuboidModel, cuboidController, svgContent, UIContent, textsScene);
        this.model = cuboidModel;
        cuboidController.setView(this);
    }

    _drawShapeUI(position) {
        let { points } = position;
        points = PolyShapeModel.convertStringToNumberArray(points);
        const { viewModel } = this.controller();
        viewModel.setPoints(points);

        this._uis.shape = this._scenes.svg.cube(viewModel).fill(this._appearance.colors.shape).attr({
            fill: this._appearance.fill || this._appearance.colors.shape,
            stroke: this._appearance.stroke || this._appearance.colors.shape,
            'stroke-width': STROKE_WIDTH / window.cvat.player.geometry.scale,
            z_order: position.z_order,
            'fill-opacity': this._appearance.fillOpacity,
        }).addClass('shape');
        this._uis.shape.projectionLineEnable = this._appearance.projectionLineEnable;
        this._controller.updateViewModel();
        this._uis.shape.addMouseOverEvents();
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
            this._uis.shape.addMouseOverEvents();
            this._uis.shape.showProjections();
        }
    }

    _makeEditable() {
        if (this._uis.shape) {
            this._controller.addEventsToCube();
            PolyShapeView.prototype._makeEditable.call(this);
            this._uis.shape.selectize(false);
        }
    }

    _makeNotEditable() {
        if (this._uis.shape && this._flags.editable) {
            CuboidController.removeEventsFromCube(this._uis.shape);
            PolyShapeView.prototype._makeNotEditable.call(this);
        }
    }

    updateColorSettings(settings) {
        ShapeView.prototype.updateColorSettings.call(this, settings);
        if (this._uis.shape) {
            this._appearance.projectionLineEnable = settings['projection-lines'];
            this.switchProjectionLine(settings['projection-lines']);
        }
    }

    updateShapeTextPosition() {
        super.updateShapeTextPosition();
        if (this._uis.shape) {
            this._uis.shape.updateThickness();
        }
    }

    switchProjectionLine(enable) {
        this._uis.shape.projectionLineEnable = enable;
    }

}

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
            this.hideProjections();

            return this;
        },

        setupFaces(viewModel) {
            this.face = this.polygon(viewModel.front.canvasPoints);
            this.right = this.polygon(viewModel.right.canvasPoints);
            this.dorsal = this.polygon(viewModel.dorsal.canvasPoints);
            this.left = this.polygon(viewModel.left.canvasPoints);
            this.dorsal.node.classList.add('occludedShape');
            this.left.node.classList.add('occludedShape');
        },

        setupProjections(viewModel) {
            this.ft_proj = this.line(this.updateProjectionLine(viewModel.ft.getEquation(), viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.fb_proj = this.line(this.updateProjectionLine(viewModel.fb.getEquation(), viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.rt_proj = this.line(this.updateProjectionLine(viewModel.rt.getEquation(), viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
            this.rb_proj = this.line(this.updateProjectionLine(viewModel.rb.getEquation(), viewModel.rb.canvasPoints[1], viewModel.vprCanvas));

            this.ft_proj.stroke({ color: '#C0C0C0' });
            this.fb_proj.stroke({ color: '#C0C0C0' });
            this.rt_proj.stroke({ color: '#C0C0C0' });
            this.rb_proj.stroke({ color: '#C0C0C0' });
        },

        setupEdges(viewModel) {
            this.front_left_edge = this.line(viewModel.fl.canvasPoints);
            this.front_right_edge = this.line(viewModel.fr.canvasPoints);
            this.dorsal_right_edge = this.line(viewModel.dr.canvasPoints);

            this.front_top_edge = this.line(viewModel.ft.canvasPoints);
            this.right_top_edge = this.line(viewModel.rt.canvasPoints);
            this.front_bot_edge = this.line(viewModel.fb.canvasPoints);
            this.right_bot_edge = this.line(viewModel.rb.canvasPoints);

            this.paintOrientationLines()
        },

        showProjections() {
            if (this.projectionLineEnable) {
                this.ft_proj.show();
                this.fb_proj.show();
                this.rt_proj.show();
                this.rb_proj.show();
            }
        },

        hideProjections() {
            this.ft_proj.hide();
            this.fb_proj.hide();
            this.rt_proj.hide();
            this.rb_proj.hide();
        },

        updateView(viewModel) {
            const convertedPoints = window.cvat.translate.points.actualToCanvas(viewModel.getPoints());
            this.updatePolygons(viewModel);
            this.updateLines(viewModel);
            this.updateProjections(viewModel);
            this.attr('points', convertedPoints);
        },

        updatePolygons(viewModel) {
            this.face.plot(viewModel.front.canvasPoints);
            this.right.plot(viewModel.right.canvasPoints);
            this.dorsal.plot(viewModel.dorsal.canvasPoints);
            this.left.plot(viewModel.left.canvasPoints);
        },

        updateLines(viewModel) {
            this.front_left_edge.plot(viewModel.fl.canvasPoints);
            this.front_right_edge.plot(viewModel.fr.canvasPoints);
            this.dorsal_right_edge.plot(viewModel.dr.canvasPoints);

            this.front_top_edge.plot(viewModel.ft.canvasPoints);
            this.right_top_edge.plot(viewModel.rt.canvasPoints);
            this.front_bot_edge.plot(viewModel.fb.canvasPoints);
            this.right_bot_edge.plot(viewModel.rb.canvasPoints);
        },

        updateThickness() {
            const edges = this.getEdges();
            const width = this.attr('stroke-width');
            const base_width_offset = 1.75;
            const expanded_width_offset = 3;
            edges.forEach((edge) => {
                edge.on('mouseover', function () {
                    this.attr({ 'stroke-width': width * expanded_width_offset });
                }).on('mouseout', function () {
                    this.attr({ 'stroke-width': width * base_width_offset });
                }).stroke({ width: width * base_width_offset, linecap: 'round' });
            });
        },

        updateProjections(viewModel) {
            this.ft_proj.plot(this.updateProjectionLine(viewModel.ft.getEquation(), viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.fb_proj.plot(this.updateProjectionLine(viewModel.fb.getEquation(), viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.rt_proj.plot(this.updateProjectionLine(viewModel.rt.getEquation(), viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
            this.rb_proj.plot(this.updateProjectionLine(viewModel.rb.getEquation(), viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
        },

        paintOrientationLines() {
            const fillColor = this.attr('fill');
            const selectedColor = '#ff007f';
            this.front_top_edge.stroke({ color: selectedColor });
            this.front_left_edge.stroke({ color: selectedColor });
            this.front_bot_edge.stroke({ color: selectedColor });
            this.front_right_edge.stroke({color: selectedColor});

            this.right_top_edge.stroke({ color: fillColor });
            this.right_bot_edge.stroke({ color: fillColor });
            this.dorsal_right_edge.stroke({ color: fillColor });
        },

        getEdges() {
            const arr = [];
            arr.push(this.front_left_edge);
            arr.push(this.front_right_edge);
            arr.push(this.dorsal_right_edge);
            arr.push(this.front_top_edge);
            arr.push(this.right_top_edge);
            arr.push(this.front_bot_edge);
            arr.push(this.right_bot_edge);
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
        },

        removeMouseOverEvents() {
            const edges = this.getEdges();
            edges.forEach((edge) => {
                edge.off('mouseover').off('mouseout');
            });
            this.left.off('mouseover').off('mouseout');
            this.dorsal.off('mouseover').off('mouseout');
        },

        resetFaceOpacity() {
            const group = this;
            this.left.attr({ 'fill-opacity': group.attr('fill-opacity') });
            this.dorsal.attr({ 'fill-opacity': group.attr('fill-opacity') });
        },
    },
    construct: {
        cube(points) {
            return this.put(new SVG.Cube()).constructorMethod(points);
        },
    },
});
