// Copyright (C) CVAT.ai Corporation
// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';

import consts from './consts';
import { Configuration, Geometry } from './canvasModel';
import { translateToSVG } from './shared';

interface TransformedShape {
    points: number[][];
    color: string;
}

export interface AutoborderHandler {
    autoborder(enabled: boolean, currentShape?: SVG.Shape, excludedClientId?: number): void;
    configure(configuration: Configuration): void;
    transform(geometry: Geometry): void;
    updateObjects(): void;
}

function collectSegmentPoints(
    points: number[][],
    startPointID: number,
    endPointID: number,
    direction: -1 | 1 | null,
): number[][] {
    if (startPointID === endPointID) {
        return [];
    }

    if (
        Math.abs(startPointID - endPointID) === 1 ||
        Math.abs(startPointID - endPointID) === points.length - 1
    ) {
        // adjacent points, no need to calculate anything
        return [points[endPointID]];
    }

    const walk = (step: number): {
        length: number;
        points: number[][];
    } => {
        let length = 0;
        let previousPoint = points[startPointID];
        const curvePoints: number[][] = [];

        for (let i = startPointID + step; ; i += step) {
            if (i < 0) {
                i = points.length - 1;
            } else if (i === points.length) {
                i = 0;
            }

            const currentPoint = points[i];
            const dx = currentPoint[0] - previousPoint[0];
            const dy = currentPoint[1] - previousPoint[1];

            length += Math.hypot(dx, dy);
            curvePoints.push([...currentPoint]);

            if (i === endPointID) {
                break;
            }

            previousPoint = currentPoint;
        }

        return {
            length,
            points: curvePoints,
        };
    };

    if (direction === 1) {
        return walk(1).points;
    }

    if (direction === -1) {
        return walk(-1).points;
    }

    const forward = walk(1);
    const backward = walk(-1);
    return forward.length <= backward.length ? forward.points : backward.points;
}

type PointIndexesAndDirection = {
    addedPointIndexes: Set<number>;
    direction: -1 | 1 | null;
};

function collectAddedPointIndexesAndDirection(
    points: number[][],
    pointsToRevertPreview: number[][],
): PointIndexesAndDirection {
    const pointKey = (point: number[]): string => `${point[0]},${point[1]}`;
    const addedPointIndexes = new Set<number>();
    const indexesByPointKey = new Map<string, number[]>();

    for (let i = 0; i < points.length; i++) {
        const key = pointKey(points[i]);
        const indexes = indexesByPointKey.get(key);

        if (indexes) {
            indexes.push(i);
        } else {
            indexesByPointKey.set(key, [i]);
        }
    }

    const originalPointKeys = new Set(pointsToRevertPreview.map(pointKey));
    for (let i = 0; i < points.length; i++) {
        if (originalPointKeys.has(pointKey(points[i]))) {
            addedPointIndexes.add(i);
        }
    }

    if (points.length < 2 || pointsToRevertPreview.length < 2) {
        return {
            addedPointIndexes,
            direction: null,
        };
    }

    const previousKey = pointKey(pointsToRevertPreview[pointsToRevertPreview.length - 2]);
    const lastKey = pointKey(pointsToRevertPreview[pointsToRevertPreview.length - 1]);
    const previousIndexes = indexesByPointKey.get(previousKey) || [];
    const lastIndexes = new Set(indexesByPointKey.get(lastKey) || []);

    for (const previousIndex of previousIndexes) {
        const nextIndex = (previousIndex + 1) % points.length;
        const prevIndex = (previousIndex - 1 + points.length) % points.length;

        if (lastIndexes.has(nextIndex)) {
            return {
                addedPointIndexes,
                direction: 1,
            };
        }

        if (lastIndexes.has(prevIndex)) {
            return {
                addedPointIndexes,
                direction: -1,
            };
        }
    }

    return {
        addedPointIndexes,
        direction: null,
    };
}

export class AutoborderHandlerImpl implements AutoborderHandler {
    private currentShape: SVG.Shape | null;
    private excludedClientId?: number;
    private container: SVGSVGElement;
    private pointGroups: SVGGElement[];
    private enabled: boolean;
    private scale: number;
    private controlPointsSize: number;
    private visibleShapes: TransformedShape[];
    private currentClick: { groupIdx: number; pointIdx: number; } | null;
    private currentPreview: { pointIdx: number; shapePoints: number[][]; } | null;
    private pointsToRevertPreview: number[][] | null;
    private listeners: Map<SVGCircleElement, { mousedown: (event: MouseEvent) => void; }>;
    private isCtrlKeyDown: (() => boolean) | null;

    public constructor(container: SVGSVGElement, isCtrlKeyDown: () => boolean) {
        this.currentShape = null;
        this.excludedClientId = undefined;
        this.container = container;
        this.pointGroups = [];
        this.enabled = false;
        this.scale = 1;
        this.controlPointsSize = consts.BASE_POINT_SIZE;
        this.visibleShapes = [];
        this.currentClick = null;
        this.currentPreview = null;
        this.pointsToRevertPreview = null;
        this.listeners = new Map();
        this.isCtrlKeyDown = isCtrlKeyDown;
    }

    private removeMarkers(): void {
        this.pointGroups.forEach((group: SVGGElement): void => {
            Array.from(group.children).forEach((circle: SVGCircleElement): void => {
                const listeners = this.listeners.get(circle);
                if (listeners) {
                    circle.removeEventListener('mousedown', listeners.mousedown);
                }
                circle.remove();
            });

            group.remove();
        });

        this.pointGroups = [];
        this.currentClick = null;
        this.listeners.clear();
    }

    private readCurrentShapePoints(): number[][] {
        return (this.currentShape as any).array().valueOf().map(
            (shapePoint: number[]): number[] => [...shapePoint],
        );
    }

    private replaceCurrentShapePoints(points: number[][]): void {
        const lastPoint = (this.currentShape as any).array().valueOf().slice(-1)[0];
        (this.currentShape as any).plot([...points, lastPoint]);

        const paintHandler = this.currentShape.remember('_paintHandler');
        paintHandler.drawCircles();
        paintHandler.set.members.forEach((el: SVG.Circle): void => {
            el.attr('stroke-width', 1 / this.scale).attr('r', 2.5 / this.scale);
            el.attr('r', `${this.controlPointsSize / this.scale}`);
        });
    }

    private raiseMarkers(): void {
        for (let i = 0; i < this.pointGroups.length; i++) {
            this.container.appendChild(this.pointGroups[i]);
        }

        if (this.currentClick !== null) {
            this.container.appendChild(this.pointGroups[this.currentClick.groupIdx]);
        }
    }

    private drawMarkers(): void {
        this.removeMarkers();

        const ns = 'http://www.w3.org/2000/svg';
        this.pointGroups = this.visibleShapes.map(
            (shape: TransformedShape, groupIdx: number): SVGGElement => {
                const group = document.createElementNS(ns, 'g');

                const circles = shape.points.map(
                    (point: number[], pointIdx: number): SVGCircleElement => {
                        const [x, y] = point;
                        const circle = document.createElementNS(ns, 'circle');
                        circle.classList.add('cvat_canvas_autoborder_point');
                        circle.setAttribute('fill', shape.color);
                        circle.setAttribute('stroke', 'black');
                        circle.setAttribute('stroke-width', `${consts.POINTS_STROKE_WIDTH / this.scale}`);
                        circle.setAttribute('cx', `${x}`);
                        circle.setAttribute('cy', `${y}`);
                        circle.setAttribute('r', `${this.controlPointsSize / this.scale}`);

                        const mousedown = (event: MouseEvent): void => {
                            if (event.button !== 0) {
                                return;
                            }

                            if (this.isCtrlKeyDown && this.isCtrlKeyDown()) {
                                return;
                            }

                            event.stopPropagation();
                            if (this.currentClick?.groupIdx !== groupIdx) {
                                // first click on this group of points

                                // svg.draw.js initializes the internal paint handler lazily,
                                // so the first autoborder click needs to bootstrap it first.
                                const handler = this.currentShape.remember('_paintHandler');
                                if (!handler || !handler.startPoint) {
                                    (this.currentShape as any).draw('point', event);
                                    (this.currentShape as any).draw('undo');
                                }

                                this.container.appendChild(group); // raise in DOM over other groups
                                const originalPoints = this.readCurrentShapePoints().slice(0, -1);
                                this.replaceCurrentShapePoints([...originalPoints, [x, y]]);
                                this.currentClick = { groupIdx, pointIdx };
                            }
                        };

                        circle.addEventListener('mousedown', mousedown);
                        this.listeners.set(circle, { mousedown });
                        return circle;
                    },
                );

                group.append(...circles);
                return group;
            },
        );

        this.container.append(...this.pointGroups);
        this.raiseMarkers();
    }

    private findClosestPointInClickedGroup(e: MouseEvent): number {
        let closestPointIdx = -1;
        if (this.currentClick === null) {
            // group not selected, do nothing
            return closestPointIdx;
        }

        const { points } = this.visibleShapes[this.currentClick.groupIdx];
        const [x, y] = translateToSVG(this.container, [e.clientX, e.clientY]);
        let distance = (consts.BASE_POINT_SIZE * 2) / this.scale;

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const dx = point[0] - x;
            const dy = point[1] - y;
            const currentDistance = Math.hypot(dx, dy);
            if (currentDistance <= distance) {
                distance = currentDistance;
                closestPointIdx = i;
            }
        }

        return closestPointIdx;
    }

    private onContainerMouseMove = (e: MouseEvent): void => {
        if (this.isCtrlKeyDown && this.isCtrlKeyDown()) {
            return;
        }

        const closestPointIdx = this.findClosestPointInClickedGroup(e);

        if (this.pointsToRevertPreview) {
            this.replaceCurrentShapePoints(this.pointsToRevertPreview);
            this.pointsToRevertPreview = null;
            this.currentPreview = null;
        }

        if (closestPointIdx === -1) {
            return;
        }

        const { points } = this.visibleShapes[this.currentClick.groupIdx];
        const {
            addedPointIndexes,
            direction,
        } = collectAddedPointIndexesAndDirection(points, this.readCurrentShapePoints().slice(0, -1));

        if (addedPointIndexes.has(closestPointIdx)) {
            return;
        }

        const curvePoints = collectSegmentPoints(points, this.currentClick.pointIdx, closestPointIdx, direction);
        this.pointsToRevertPreview = this.readCurrentShapePoints().slice(0, -1);
        this.currentPreview = {
            pointIdx: closestPointIdx,
            shapePoints: [...this.pointsToRevertPreview, ...curvePoints],
        };
        this.replaceCurrentShapePoints(this.currentPreview.shapePoints);
    };

    private onContainerMouseDown = (e: MouseEvent): void => {
        if (this.isCtrlKeyDown && this.isCtrlKeyDown()) {
            return;
        }

        if (e.button !== 0 || this.currentPreview === null) {
            return;
        }

        const closestPointIdx = this.findClosestPointInClickedGroup(e);
        if (closestPointIdx === this.currentPreview.pointIdx) {
            e.stopPropagation();
            this.currentPreview = null;
            this.pointsToRevertPreview = null;
            this.currentClick.pointIdx = closestPointIdx;
        }
    };

    private setObjectsFromContainer(): void {
        const shapes = Array.from(this.container.getElementsByClassName('cvat_canvas_shape')).filter(
            (shape: HTMLElement): boolean => !shape.classList.contains('cvat_canvas_hidden'),
        );

        this.visibleShapes = shapes.map((shape: HTMLElement): TransformedShape | null => {
            const color = shape.getAttribute('fill');
            const clientId = shape.getAttribute('clientID');

            const isSupportedType =
                shape.tagName === 'polyline' ||
                shape.tagName === 'polygon' ||
                shape.tagName === 'rect';

            if (
                color === null || clientId === null || !isSupportedType ||
                (typeof this.excludedClientId === 'number' && +clientId === this.excludedClientId)
            ) {
                return null;
            }

            let points = '';
            if (shape.tagName === 'polyline' || shape.tagName === 'polygon') {
                points = shape.getAttribute('points');
            } else if (shape.tagName === 'rect') {
                const x = +shape.getAttribute('x');
                const y = +shape.getAttribute('y');
                const width = +shape.getAttribute('width');
                const height = +shape.getAttribute('height');

                if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(width) || Number.isNaN(height)) {
                    return null;
                }

                points = `${x},${y} ${x + width},${y} ${x + width},${y + height} ${x},${y + height}`;
            }

            return {
                color,
                points: points.trim().split(/\s/).map(
                    (shapePoint: string): number[] => shapePoint.split(',')
                        .map((coordinate: string): number => +coordinate),
                ),
            };
        }).filter((state: TransformedShape | null): boolean => state !== null);
    }

    public updateObjects(): void {
        if (this.enabled) {
            this.setObjectsFromContainer();
            this.drawMarkers();
        }
    }

    public autoborder(enabled: boolean, currentShape?: SVG.Shape, excludedClientId?: number): void {
        if (enabled && !this.enabled && currentShape) {
            this.enabled = true;
            this.currentShape = currentShape;
            this.excludedClientId = excludedClientId;
            this.updateObjects();

            this.container.addEventListener('mousemove', this.onContainerMouseMove);
            this.container.addEventListener('mousedown', this.onContainerMouseDown, { capture: true });
            this.currentShape.on('undopoint', (): void => {
                this.currentClick = null;
                this.currentPreview = null;

                if (this.pointsToRevertPreview) {
                    this.replaceCurrentShapePoints(this.pointsToRevertPreview);
                    this.pointsToRevertPreview = null;
                }
            });

            this.currentShape.on('drawpoint', (): void => {
                this.currentClick = null;
                this.currentPreview = null;
                this.pointsToRevertPreview = null;
            });
        } else {
            this.container.removeEventListener('mousemove', this.onContainerMouseMove);
            this.container.removeEventListener('mousedown', this.onContainerMouseDown);
            this.removeMarkers();
            this.enabled = false;
            this.currentShape = null;
        }
    }

    public transform(geometry: Geometry): void {
        this.scale = geometry.scale;

        this.pointGroups.forEach((group: SVGGElement): void => {
            Array.from(group.children).forEach((circle: SVGCircleElement): void => {
                circle.setAttribute('r', `${this.controlPointsSize / this.scale}`);
                circle.setAttribute('stroke-width', `${consts.BASE_STROKE_WIDTH / this.scale}`);
            });
        });
    }

    public configure(configuration: Configuration): void {
        this.controlPointsSize = configuration.controlPointsSize ?? consts.BASE_POINT_SIZE;
    }
}
