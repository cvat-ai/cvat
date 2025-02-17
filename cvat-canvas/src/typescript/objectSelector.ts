// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import { expandChannels, imageDataToDataURL, translateToSVG } from './shared';
import { Geometry } from './canvasModel';
import consts from './consts';

export interface SelectionFilter {
    objectType?: string[];
    shapeType?: string[];
    maxCount?: number;
}

export interface ObjectSelector {
    enable(
        callback: (selected: ObjectState[]) => void,
        filter?: SelectionFilter,
    ): void;
    transform(geometry: Geometry): void;
    push(state: ObjectState): void;
    disable(): void;
    resetSelected(): void;
}

export type ObjectState = any;

export class ObjectSelectorImpl implements ObjectSelector {
    private selectionFilter: SelectionFilter | null;
    private canvas: SVG.Container;
    private selectionRect: SVG.Rect;
    private geometry: Geometry;
    private isEnabled: boolean;
    private mouseDownPosition: { x: number; y: number; };
    private selectedObjects: Record<number, ObjectState>;
    private resetAppearance: Record<number, () => void>;
    private findObjectOnClick: (event: MouseEvent) => void;
    private getStates: () => ObjectState[];
    private onSelectCallback: (selected: ObjectState[]) => void;

    public constructor(
        findObjectOnClick: (event: MouseEvent) => void,
        getStates: () => ObjectState[],
        geometry: Geometry,
        canvas: SVG.Container,
    ) {
        this.findObjectOnClick = findObjectOnClick;
        this.getStates = getStates;
        this.geometry = geometry;
        this.canvas = canvas;
        this.selectionRect = null;
        this.isEnabled = false;
        this.selectedObjects = {};
        this.resetAppearance = {};
        this.mouseDownPosition = { x: 0, y: 0 };
        this.selectionFilter = null;
    }

    private getSelectionBox(event: MouseEvent): {
        xtl: number;
        ytl: number;
        xbr: number;
        ybr: number;
    } {
        const point = translateToSVG((this.canvas.node as any) as SVGSVGElement, [event.clientX, event.clientY]);
        return {
            xtl: Math.min(this.mouseDownPosition.x, point[0]),
            ytl: Math.min(this.mouseDownPosition.y, point[1]),
            xbr: Math.max(this.mouseDownPosition.x, point[0]),
            ybr: Math.max(this.mouseDownPosition.y, point[1]),
        };
    }

    private filterObjects(states: ObjectState[]): ObjectState[] {
        let count = Object.keys(this.selectedObjects).length;
        const maxCount = this.selectionFilter.maxCount || Number.MAX_SAFE_INTEGER;
        const filtered = [];
        for (const state of states) {
            const { objectType, shapeType } = state;
            const objectTypes = this.selectionFilter.objectType || [objectType];
            const shapeTypes = this.selectionFilter.shapeType || [shapeType];
            if (objectTypes.includes(objectType) && shapeTypes.includes(shapeType)) {
                if (count < maxCount) {
                    filtered.push(state);
                    count++;
                }
            }
        }

        return filtered;
    }

    private onMouseDown = (event: MouseEvent): void => {
        const point = translateToSVG((this.canvas.node as any) as SVGSVGElement, [event.clientX, event.clientY]);
        this.mouseDownPosition = { x: point[0], y: point[1] };
        this.selectionRect = this.canvas.rect().addClass('cvat_canvas_selection_box');
        this.selectionRect.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / this.geometry.scale });
        this.selectionRect.attr({ ...this.mouseDownPosition });
    };

    private onMouseUp = (event: MouseEvent): void => {
        if (this.selectionRect) {
            this.selectionRect.remove();
            this.selectionRect = null;

            const states = this.getStates();
            const box = this.getSelectionBox(event);
            const shapes = (this.canvas.select('.cvat_canvas_shape') as any).members.filter(
                (shape: SVG.Shape): boolean => !shape.hasClass('cvat_canvas_hidden'),
            );

            let newStates = [];
            for (const shape of shapes) {
                const bbox = shape.bbox();
                const clientID = shape.attr('clientID');
                if (
                    bbox.x > box.xtl &&
                    bbox.y > box.ytl &&
                    bbox.x + bbox.width < box.xbr &&
                    bbox.y + bbox.height < box.ybr &&
                    !(clientID in this.selectedObjects)
                ) {
                    const objectState = states.find((state: ObjectState): boolean => state.clientID === clientID);
                    if (objectState) {
                        newStates.push(objectState);
                    }
                }
            }

            newStates = this.filterObjects(newStates);
            if (newStates.length) {
                newStates.forEach((_state) => {
                    this.selectedObjects[_state.clientID] = _state;
                });
                this.onSelectCallback(Object.values(this.selectedObjects));
            }
        }
    };

    private onMouseMove = (event: MouseEvent): void => {
        if (this.selectionRect) {
            const box = this.getSelectionBox(event);
            this.selectionRect.attr({
                x: box.xtl,
                y: box.ytl,
                width: box.xbr - box.xtl,
                height: box.ybr - box.ytl,
            });
        }
    };

    public enable(callback: (selected: ObjectState[]) => void, filter?: SelectionFilter): void {
        if (!this.isEnabled) {
            window.document.addEventListener('mouseup', this.onMouseUp);
            this.canvas.node.addEventListener('mousedown', this.onMouseDown);
            this.canvas.node.addEventListener('mousemove', this.onMouseMove);
            this.canvas.node.addEventListener('click', this.findObjectOnClick);

            this.selectedObjects = {};
            this.onSelectCallback = (_selected: ObjectState[]): void => {
                const appendToSelection = (objectState: ObjectState): (() => void) => {
                    const { clientID } = objectState;
                    const shape = this.canvas.select(`#cvat_canvas_shape_${clientID}`).first();
                    if (shape) {
                        shape.addClass('cvat_canvas_shape_selection');
                        if (objectState.shapeType === 'mask') {
                            const { points } = objectState;
                            const colorRGB = [252, 251, 252];
                            const [left, top, right, bottom] = points.slice(-4);
                            const imageBitmap = expandChannels(colorRGB[0], colorRGB[1], colorRGB[2], points);

                            const bbox = shape.bbox();
                            const image = this.canvas.image().attr({
                                'color-rendering': 'optimizeQuality',
                                'shape-rendering': 'geometricprecision',
                                'data-z-order': Number.MAX_SAFE_INTEGER,
                                'grouping-copy-for': clientID,
                            }).move(bbox.x, bbox.y);

                            imageDataToDataURL(
                                imageBitmap,
                                right - left + 1,
                                bottom - top + 1,
                                (dataURL: string) => new Promise((resolve, reject) => {
                                    image.loaded(() => {
                                        resolve();
                                    });
                                    image.error(() => {
                                        reject();
                                    });
                                    image.load(dataURL);
                                }),
                            );

                            image.style('filter', 'drop-shadow(2px 4px 6px black)'); // for better visibility
                            image.attr('opacity', 0.5);
                            return () => {
                                image.remove();
                                shape.removeClass('cvat_canvas_shape_selection');
                            };
                        }

                        return () => shape.removeClass('cvat_canvas_shape_selection');
                    }

                    return () => {};
                };

                for (const state of _selected) {
                    if (!Object.hasOwn(this.resetAppearance, state.clientID)) {
                        this.resetAppearance[state.clientID] = appendToSelection(state);
                    }
                }

                for (const clientID of Object.keys(this.resetAppearance)) {
                    if (!_selected.some((state) => state.clientID === +clientID)) {
                        this.resetAppearance[clientID]();
                        delete this.resetAppearance[clientID];
                    }
                }

                callback(_selected);
            };

            this.selectionFilter = filter;
            this.isEnabled = true;
        }
    }

    public disable(): void {
        window.document.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.node.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.node.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.node.removeEventListener('click', this.findObjectOnClick);

        if (this.selectionRect) {
            this.selectionRect.remove();
            this.selectionRect = null;
        }

        for (const clientID of Object.keys(this.resetAppearance)) {
            this.resetAppearance[clientID]();
        }

        this.onSelectCallback = null;
        this.resetAppearance = {};
        this.isEnabled = false;
    }

    public push(state: ObjectState): void {
        if (this.isEnabled) {
            if (!Object.hasOwn(this.selectedObjects, state.clientID)) {
                const filtered = this.filterObjects([state]);
                if (filtered.length) {
                    filtered.forEach((_state) => {
                        this.selectedObjects[_state.clientID] = _state;
                    });
                    this.onSelectCallback(Object.values(this.selectedObjects));
                }
            } else {
                delete this.selectedObjects[state.clientID];
                this.onSelectCallback(Object.values(this.selectedObjects));
            }
        }
    }

    public transform(geometry: Geometry): void {
        this.geometry = geometry;
        if (this.selectionRect) {
            this.selectionRect.attr({ 'stroke-width': consts.BASE_STROKE_WIDTH / geometry.scale });
        }
    }

    public resetSelected(): void {
        if (this.isEnabled) {
            for (const clientID of Object.keys(this.resetAppearance)) {
                this.resetAppearance[clientID]();
            }
            this.selectedObjects = {};
            this.resetAppearance = {};

            if (this.onSelectCallback) {
                this.onSelectCallback([]);
            }
        }
    }
}
