// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import * as SVG from 'svg.js';
import { SplitData } from './canvasModel';

export interface SplitHandler {
    split(splitData: SplitData): void;
    select(state: any): void;
    cancel(): void;
}

export class SplitHandlerImpl implements SplitHandler {
    // callback is used to notify about splitting end
    private onSplitDone: (object?: any, duration?: number) => void;
    private onFindObject: (event: MouseEvent) => void;
    private canvas: SVG.Container;
    private highlightedShape: SVG.Shape | null;
    private initialized: boolean;
    private splitDone: boolean;
    private startTimestamp: number;

    private resetShape(): void {
        if (this.highlightedShape) {
            this.highlightedShape.removeClass('cvat_canvas_shape_splitting');
            this.highlightedShape.off('click.split');
            this.highlightedShape = null;
        }
    }

    private release(): void {
        if (this.initialized) {
            this.resetShape();
            this.canvas.node.removeEventListener('mousemove', this.findObject);
            this.initialized = false;
        }
    }

    private initSplitting(): void {
        this.canvas.node.addEventListener('mousemove', this.findObject);
        this.initialized = true;
        this.splitDone = false;
        this.startTimestamp = Date.now();
    }

    private closeSplitting(): void {
        // Split done is true if an object was split
        // Split also can be called with { enabled: false } without splitting an object
        if (!this.splitDone) {
            this.onSplitDone(null);
        }
        this.release();
    }

    private findObject = (e: MouseEvent): void => {
        this.resetShape();
        this.onFindObject(e);
    };

    public constructor(
        onSplitDone: SplitHandlerImpl['onSplitDone'],
        onFindObject: SplitHandlerImpl['onFindObject'],
        canvas: SVG.Container,
    ) {
        this.onSplitDone = onSplitDone;
        this.onFindObject = onFindObject;
        this.canvas = canvas;
        this.highlightedShape = null;
        this.initialized = false;
        this.splitDone = false;
        this.startTimestamp = Date.now();
    }

    public split(splitData: SplitData): void {
        if (splitData.enabled) {
            this.initSplitting();
        } else {
            this.closeSplitting();
        }
    }

    public select(state: any): void {
        if (state.objectType === 'track') {
            const shape = this.canvas.select(`#cvat_canvas_shape_${state.clientID}`).first();
            if (shape && shape !== this.highlightedShape) {
                this.resetShape();
                this.highlightedShape = shape;
                this.highlightedShape.addClass('cvat_canvas_shape_splitting');
                this.canvas.node.append(this.highlightedShape.node);
                this.highlightedShape.on(
                    'click.split',
                    (): void => {
                        this.splitDone = true;
                        this.onSplitDone(state, Date.now() - this.startTimestamp);
                    }, { once: true },
                );
            }
        }
    }

    public cancel(): void {
        this.release();
        this.onSplitDone(null);
        // here is a cycle
        // onSplitDone => controller => model => view => closeSplitting
        // one call of closeMerging is unuseful, but it's okey
    }
}
