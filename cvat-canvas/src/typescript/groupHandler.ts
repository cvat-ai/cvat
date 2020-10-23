// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import { GroupData } from './canvasModel';

import { translateToSVG } from './shared';

export interface GroupHandler {
    group(groupData: GroupData): void;
    select(state: any): void;
    cancel(): void;
    resetSelectedObjects(): void;
}

export class GroupHandlerImpl implements GroupHandler {
    // callback is used to notify about grouping end
    private onGroupDone: (objects?: any[]) => void;
    private getStates: () => any[];
    private onFindObject: (event: MouseEvent) => void;
    private bindedOnSelectStart: (event: MouseEvent) => void;
    private bindedOnSelectUpdate: (event: MouseEvent) => void;
    private bindedOnSelectStop: (event: MouseEvent) => void;
    private selectionRect: SVG.Rect;
    private startSelectionPoint: {
        x: number;
        y: number;
    };
    private canvas: SVG.Container;
    private initialized: boolean;
    private statesToBeGroupped: any[];
    private highlightedShapes: Record<number, SVG.Shape>;

    private getSelectionBox(
        event: MouseEvent,
    ): {
        xtl: number;
        ytl: number;
        xbr: number;
        ybr: number;
    } {
        const point = translateToSVG((this.canvas.node as any) as SVGSVGElement, [event.clientX, event.clientY]);
        const stopSelectionPoint = {
            x: point[0],
            y: point[1],
        };

        return {
            xtl: Math.min(this.startSelectionPoint.x, stopSelectionPoint.x),
            ytl: Math.min(this.startSelectionPoint.y, stopSelectionPoint.y),
            xbr: Math.max(this.startSelectionPoint.x, stopSelectionPoint.x),
            ybr: Math.max(this.startSelectionPoint.y, stopSelectionPoint.y),
        };
    }

    private onSelectStart(event: MouseEvent): void {
        if (!this.selectionRect) {
            const point = translateToSVG((this.canvas.node as any) as SVGSVGElement, [event.clientX, event.clientY]);
            this.startSelectionPoint = {
                x: point[0],
                y: point[1],
            };

            this.selectionRect = this.canvas.rect().addClass('cvat_canvas_shape_grouping');
            this.selectionRect.attr({ ...this.startSelectionPoint });
        }
    }

    private onSelectUpdate(event: MouseEvent): void {
        // called on mousemove
        if (this.selectionRect) {
            const box = this.getSelectionBox(event);

            this.selectionRect.attr({
                x: box.xtl,
                y: box.ytl,
                width: box.xbr - box.xtl,
                height: box.ybr - box.ytl,
            });
        }
    }

    private onSelectStop(event: MouseEvent): void {
        // called on mouseup, mouseleave
        if (this.selectionRect) {
            this.selectionRect.remove();
            this.selectionRect = null;

            const box = this.getSelectionBox(event);
            const shapes = (this.canvas.select('.cvat_canvas_shape') as any).members.filter(
                (shape: SVG.Shape): boolean => !shape.hasClass('cvat_canvas_hidden'),
            );
            for (const shape of shapes) {
                // TODO: Doesn't work properly for groups
                const bbox = shape.bbox();
                const clientID = shape.attr('clientID');
                if (
                    bbox.x > box.xtl &&
                    bbox.y > box.ytl &&
                    bbox.x + bbox.width < box.xbr &&
                    bbox.y + bbox.height < box.ybr &&
                    !(clientID in this.highlightedShapes)
                ) {
                    const objectState = this.getStates().filter(
                        (state: any): boolean => state.clientID === clientID,
                    )[0];

                    if (objectState) {
                        this.statesToBeGroupped.push(objectState);
                        this.highlightedShapes[clientID] = shape;
                        (shape as any).addClass('cvat_canvas_shape_grouping');
                    }
                }
            }
        }
    }

    private release(): void {
        this.canvas.node.removeEventListener('click', this.onFindObject);
        this.canvas.node.removeEventListener('mousedown', this.bindedOnSelectStart);
        this.canvas.node.removeEventListener('mousemove', this.bindedOnSelectUpdate);
        this.canvas.node.removeEventListener('mouseup', this.bindedOnSelectStop);

        this.resetSelectedObjects();
        this.initialized = false;
        this.selectionRect = null;
        this.startSelectionPoint = {
            x: null,
            y: null,
        };
    }

    private initGrouping(): void {
        this.canvas.node.addEventListener('click', this.onFindObject);
        this.canvas.node.addEventListener('mousedown', this.bindedOnSelectStart);
        this.canvas.node.addEventListener('mousemove', this.bindedOnSelectUpdate);
        this.canvas.node.addEventListener('mouseup', this.bindedOnSelectStop);

        this.initialized = true;
    }

    private closeGrouping(): void {
        if (this.initialized) {
            const { statesToBeGroupped } = this;
            this.release();

            if (statesToBeGroupped.length) {
                this.onGroupDone(statesToBeGroupped);
            } else {
                this.onGroupDone();
            }
        }
    }

    public constructor(
        onGroupDone: (objects?: any[]) => void,
        getStates: () => any[],
        onFindObject: (event: MouseEvent) => void,
        canvas: SVG.Container,
    ) {
        this.onGroupDone = onGroupDone;
        this.getStates = getStates;
        this.onFindObject = onFindObject;
        this.canvas = canvas;
        this.statesToBeGroupped = [];
        this.highlightedShapes = {};
        this.selectionRect = null;
        this.initialized = false;
        this.startSelectionPoint = {
            x: null,
            y: null,
        };

        this.bindedOnSelectStart = this.onSelectStart.bind(this);
        this.bindedOnSelectUpdate = this.onSelectUpdate.bind(this);
        this.bindedOnSelectStop = this.onSelectStop.bind(this);
    }

    /* eslint-disable-next-line */
    public group(groupData: GroupData): void {
        if (groupData.enabled) {
            this.initGrouping();
        } else {
            this.closeGrouping();
        }
    }

    public select(objectState: any): void {
        const stateIndexes = this.statesToBeGroupped.map((state): number => state.clientID);
        const includes = stateIndexes.indexOf(objectState.clientID);
        if (includes !== -1) {
            const shape = this.highlightedShapes[objectState.clientID];
            this.statesToBeGroupped.splice(includes, 1);
            if (shape) {
                delete this.highlightedShapes[objectState.clientID];
                shape.removeClass('cvat_canvas_shape_grouping');
            }
        } else {
            const shape = this.canvas.select(`#cvat_canvas_shape_${objectState.clientID}`).first();
            if (shape) {
                this.statesToBeGroupped.push(objectState);
                this.highlightedShapes[objectState.clientID] = shape;
                shape.addClass('cvat_canvas_shape_grouping');
            }
        }
    }

    public resetSelectedObjects(): void {
        for (const state of this.statesToBeGroupped) {
            const shape = this.highlightedShapes[state.clientID];
            shape.removeClass('cvat_canvas_shape_grouping');
        }
        this.statesToBeGroupped = [];
        this.highlightedShapes = {};
    }

    public cancel(): void {
        this.release();
        this.onGroupDone();
    }
}
