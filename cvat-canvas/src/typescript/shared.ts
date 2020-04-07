// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import consts from './consts';

export interface ShapeSizeElement {
    sizeElement: any;
    update(shape: SVG.Shape): void;
    rm(): void;
}

export interface Box {
    xtl: number;
    ytl: number;
    xbr: number;
    ybr: number;
}

export interface BBox {
    width: number;
    height: number;
    x: number;
    y: number;
}

// Translate point array from the canvas coordinate system
// to the coordinate system of a client
export function translateFromSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = svg.getScreenCTM() as DOMMatrix;
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length - 1; i += 2) {
        pt.x = points[i];
        pt.y = points[i + 1];
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

// Translate point array from the coordinate system of a client
// to the canvas coordinate system
export function translateToSVG(svg: SVGSVGElement, points: number[]): number[] {
    const output = [];
    const transformationMatrix = (svg.getScreenCTM() as DOMMatrix).inverse();
    let pt = svg.createSVGPoint();
    for (let i = 0; i < points.length; i += 2) {
        pt.x = points[i];
        pt.y = points[i + 1];
        pt = pt.matrixTransform(transformationMatrix);
        output.push(pt.x, pt.y);
    }

    return output;
}

export function pointsToString(points: number[]): string {
    return points.reduce((acc, val, idx): string => {
        if (idx % 2) {
            return `${acc},${val}`;
        }

        return `${acc} ${val}`.trim();
    }, '');
}

export function pointsToArray(points: string): number[] {
    return points.trim().split(/[,\s]+/g)
        .map((coord: string): number => +coord);
}

export function displayShapeSize(
    shapesContainer: SVG.Container,
    textContainer: SVG.Container,
): ShapeSizeElement {
    const shapeSize: ShapeSizeElement = {
        sizeElement: textContainer.text('').font({
            weight: 'bolder',
        }).fill('white').addClass('cvat_canvas_text'),
        update(shape: SVG.Shape): void{
            const bbox = shape.bbox();
            const text = `${bbox.width.toFixed(1)}x${bbox.height.toFixed(1)}`;
            const [x, y]: number[] = translateToSVG(
                textContainer.node as any as SVGSVGElement,
                translateFromSVG((shapesContainer.node as any as SVGSVGElement), [bbox.x, bbox.y]),
            );
            this.sizeElement.clear().plain(text)
                .move(x + consts.TEXT_MARGIN, y + consts.TEXT_MARGIN);
        },
        rm(): void {
            if (this.sizeElement) {
                this.sizeElement.remove();
                this.sizeElement = null;
            }
        },
    };

    return shapeSize;
}




export const Cube = SVG.invent({
    create: 'g',
    inherit: SVG.G,
    extend: {

        constructorMethod(viewModel): any {
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

        setupFaces(viewModel): void {
            this.face = this.polygon(viewModel.front.canvasPoints);
            this.right = this.polygon(viewModel.right.canvasPoints);
            this.dorsal = this.polygon(viewModel.dorsal.canvasPoints);
            this.left = this.polygon(viewModel.left.canvasPoints);
        },

        setupProjections(viewModel): void {
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

        setupEdges(viewModel): void {
            this.frontLeftEdge = this.line(viewModel.fl.canvasPoints);
            this.frontRightEdge = this.line(viewModel.fr.canvasPoints);
            this.dorsalRightEdge = this.line(viewModel.dr.canvasPoints);
            this.dorsalLeftEdge = this.line(viewModel.dl.canvasPoints);

            this.frontTopEdge = this.line(viewModel.ft.canvasPoints);
            this.rightTopEdge = this.line(viewModel.rt.canvasPoints);
            this.frontBotEdge = this.line(viewModel.fb.canvasPoints);
            this.rightBotEdge = this.line(viewModel.rb.canvasPoints);
        },

        setupGrabPoints(): void {
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

        updateGrabPoints(): void {
            const centers = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < centers.length; i += 1) {
                const edge = edges[`${i}`];
                centers[`${i}`].center(edge.cx(), edge.cy());
            }
        },

        move(dx, dy): void {
            this.face.dmove(dx, dy);
            this.dorsal.dmove(dx, dy);
            this.right.dmove(dx, dy);
            this.left.dmove(dx, dy);

            const edges = this.getEdges();
            edges.forEach((edge): void => {
                edge.dmove(dx, dy);
            });
        },

        showProjections(): void {
            if (this.projectionLineEnable) {
                this.ftProj.show();
                this.fbProj.show();
                this.rtProj.show();
                this.rbProj.show();
            }
        },

        hideProjections(): void {
            this.ftProj.hide();
            this.fbProj.hide();
            this.rtProj.hide();
            this.rbProj.hide();
        },

        showGrabPoints(): void {
            const grabPoints = this.getGrabPoints();
            grabPoints.forEach((point): void => {
                point.show();
            });
        },

        hideGrabPoints(): void {
            const grabPoints = this.getGrabPoints();
            grabPoints.forEach((point): void => {
                point.hide();
            });
        },

        updateView(viewModel): void {
            const convertedPoints = window.cvat.translate.points.actualToCanvas(
                viewModel.getPoints(),
            );
            this.updatePolygons(viewModel);
            this.updateLines(viewModel);
            this.updateProjections(viewModel);
            this.updateGrabPoints();
            this.attr('points', convertedPoints);
        },

        updatePolygons(viewModel): void {
            this.face.plot(viewModel.front.canvasPoints);
            this.right.plot(viewModel.right.canvasPoints);
            this.dorsal.plot(viewModel.dorsal.canvasPoints);
            this.left.plot(viewModel.left.canvasPoints);
        },

        updateLines(viewModel): void {
            this.frontLeftEdge.plot(viewModel.fl.canvasPoints);
            this.frontRightEdge.plot(viewModel.fr.canvasPoints);
            this.dorsalRightEdge.plot(viewModel.dr.canvasPoints);
            this.dorsalLeftEdge.plot(viewModel.dl.canvasPoints);

            this.frontTopEdge.plot(viewModel.ft.canvasPoints);
            this.rightTopEdge.plot(viewModel.rt.canvasPoints);
            this.frontBotEdge.plot(viewModel.fb.canvasPoints);
            this.rightBotEdge.plot(viewModel.rb.canvasPoints);
        },

        updateThickness(): void {
            const edges = this.getEdges();
            const width = this.attr('stroke-width');
            const baseWidthOffset = 1.75;
            const expandedWidthOffset = 3;
            edges.forEach((edge): void => {
                edge.on('mouseover', function (): void {
                    this.attr({ 'stroke-width': width * expandedWidthOffset });
                }).on('mouseout', function (): void {
                    this.attr({ 'stroke-width': width * baseWidthOffset });
                }).stroke({ width: width * baseWidthOffset, linecap: 'round' });
            });
        },

        updateProjections(viewModel): void {
            this.ftProj.plot(this.updateProjectionLine(viewModel.ft.getEquation(),
                viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.fbProj.plot(this.updateProjectionLine(viewModel.fb.getEquation(),
                viewModel.ft.canvasPoints[0], viewModel.vplCanvas));
            this.rtProj.plot(this.updateProjectionLine(viewModel.rt.getEquation(),
                viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
            this.rbProj.plot(this.updateProjectionLine(viewModel.rb.getEquation(),
                viewModel.rt.canvasPoints[1], viewModel.vprCanvas));
        },

        paintOrientationLines(): void {
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

        getEdges(): any[] {
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

        getGrabPoints(): any[] {
            const arr = [];
            arr.push(this.flCenter);
            arr.push(this.frCenter);
            arr.push(this.drCenter);
            arr.push(this.ftCenter);
            arr.push(this.fbCenter);
            arr.push(this.dlCenter);
            return arr;
        },

        updateProjectionLine(equation, source, direction): any[] {
            const x1 = source.x;
            const y1 = equation.getYCanvas(x1);

            const x2 = direction.x;
            const y2 = equation.getYCanvas(x2);
            return [[x1, y1], [x2, y2]];
        },

        addMouseOverEvents(): void {
            this._addFaceEvents();
        },

        addFaceEvents() {
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

