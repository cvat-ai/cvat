// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import { MergeData } from './canvasModel';

export interface MergeHandler {
    merge(mergeData: MergeData): void;
    select(state: any): void;
    cancel(): void;
    repeatSelection(): void;
}


export class MergeHandlerImpl implements MergeHandler {
    // callback is used to notify about merging end
    private onMergeDone: (objects: any[] | null, duration?: number) => void;
    private onFindObject: (event: MouseEvent) => void;
    private startTimestamp: number;
    private canvas: SVG.Container;
    private initialized: boolean;
    private statesToBeMerged: any[]; // are being merged
    private highlightedShapes: Record<number, SVG.Shape>;
    private constraints: {
        labelID: number;
        shapeType: string;
    };

    private addConstraints(): void {
        const shape = this.statesToBeMerged[0];
        this.constraints = {
            labelID: shape.label.id,
            shapeType: shape.shapeType,
        };
    }

    private removeConstraints(): void {
        this.constraints = null;
    }

    private checkConstraints(state: any): boolean {
        return !this.constraints || (state.label.id === this.constraints.labelID
            && state.shapeType === this.constraints.shapeType);
    }

    private release(): void {
        this.removeConstraints();
        this.canvas.node.removeEventListener('click', this.onFindObject);
        for (const state of this.statesToBeMerged) {
            const shape = this.highlightedShapes[state.clientID];
            shape.removeClass('cvat_canvas_shape_merging');
        }
        this.statesToBeMerged = [];
        this.highlightedShapes = {};
        this.initialized = false;
    }

    private initMerging(): void {
        this.canvas.node.addEventListener('click', this.onFindObject);
        this.startTimestamp = Date.now();
        this.initialized = true;
    }

    private closeMerging(): void {
        if (this.initialized) {
            const { statesToBeMerged } = this;
            this.release();

            if (statesToBeMerged.length > 1) {
                this.onMergeDone(statesToBeMerged, Date.now() - this.startTimestamp);
            } else {
                this.onMergeDone(null);
                // here is a cycle
                // onMergeDone => controller => model => view => closeMerging
                // one call of closeMerging is unuseful, but it's okey
            }
        }
    }

    public constructor(
        onMergeDone: (objects: any[] | null, duration?: number) => void,
        onFindObject: (event: MouseEvent) => void,
        canvas: SVG.Container,
    ) {
        this.onMergeDone = onMergeDone;
        this.onFindObject = onFindObject;
        this.startTimestamp = Date.now();
        this.canvas = canvas;
        this.statesToBeMerged = [];
        this.highlightedShapes = {};
        this.constraints = null;
        this.initialized = false;
    }

    public merge(mergeData: MergeData): void {
        if (mergeData.enabled) {
            this.initMerging();
        } else {
            this.closeMerging();
        }
    }

    public select(objectState: any): void {
        const stateIndexes = this.statesToBeMerged.map((state): number => state.clientID);
        const stateFrames = this.statesToBeMerged.map((state): number => state.frame);
        const includes = stateIndexes.indexOf(objectState.clientID);
        if (includes !== -1) {
            const shape = this.highlightedShapes[objectState.clientID];
            this.statesToBeMerged.splice(includes, 1);
            if (shape) {
                delete this.highlightedShapes[objectState.clientID];
                shape.removeClass('cvat_canvas_shape_merging');
            }

            if (!this.statesToBeMerged.length) {
                this.removeConstraints();
            }
        } else {
            const shape = this.canvas.select(`#cvat_canvas_shape_${objectState.clientID}`).first();
            if (shape && this.checkConstraints(objectState)
            && !stateFrames.includes(objectState.frame)) {
                this.statesToBeMerged.push(objectState);
                this.highlightedShapes[objectState.clientID] = shape;
                shape.addClass('cvat_canvas_shape_merging');

                if (this.statesToBeMerged.length === 1) {
                    this.addConstraints();
                }
            }
        }
    }

    public repeatSelection(): void {
        for (const objectState of this.statesToBeMerged) {
            const shape = this.canvas.select(`#cvat_canvas_shape_${objectState.clientID}`).first();
            if (shape) {
                this.highlightedShapes[objectState.clientID] = shape;
                shape.addClass('cvat_canvas_shape_merging');
            }
        }
    }

    public cancel(): void {
        this.release();
        this.onMergeDone(null);
        // here is a cycle
        // onMergeDone => controller => model => view => closeMerging
        // one call of closeMerging is unuseful, but it's okey
    }
}
