import * as SVG from 'svg.js';
import { SplitData } from './canvasModel';

export interface SplitHandler {
    split(splitData: SplitData): void;
    select(state: any): void;
    cancel(): void;
}

export class SplitHandlerImpl implements SplitHandler {
    // callback is used to notify about splitting end
    private onSplitDone: (object: any) => void;
    private onFindObject: (event: MouseEvent) => void;
    private canvas: SVG.Container;
    private highlightedShape: SVG.Shape;
    private initialized: boolean;

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
            this.canvas.node.removeEventListener('mousemove', this.onFindObject);
            this.initialized = false;
        }
    }

    private initSplitting(): void {
        this.canvas.node.addEventListener('mousemove', this.onFindObject);
        this.initialized = true;
    }

    private closeSplitting(): void {
        this.release();
    }

    public constructor(
        onSplitDone: (object: any) => void,
        onFindObject: (event: MouseEvent) => void,
        canvas: SVG.Container,
    ) {
        this.onSplitDone = onSplitDone;
        this.onFindObject = onFindObject;
        this.canvas = canvas;
        this.highlightedShape = null;
        this.initialized = false;
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
                this.highlightedShape.on('click.split', (): void => {
                    this.onSplitDone(state);
                }, {
                    once: true,
                });
            }
        } else {
            this.resetShape();
        }
    }

    public cancel(): void {
        this.release();
        this.onSplitDone(null);
    }
}
