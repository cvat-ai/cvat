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
    private initialized: boolean;

    private release(): void {
        if (this.initialized) {
            this.canvas.node.removeEventListener('click', this.onFindObject);
            this.initialized = false;
        }
    }

    private initSplitting(): void {
        this.canvas.node.addEventListener('click', this.onFindObject);
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
        this.onSplitDone(state);
    }

    public cancel(): void {
        this.release();
        this.onSplitDone(null);
    }
}
