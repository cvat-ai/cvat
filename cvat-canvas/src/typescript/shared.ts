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
