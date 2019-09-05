import * as SVG from 'svg.js';
import { MergeData } from './canvasModel';

export interface MergeHandler {
    merge(mergeData: MergeData): void;
    select(state: any): void;
    cancel(): void;
}


export class MergeHandlerImpl implements MergeHandler {
    // callback is used to notify about merging end
    private onMergeDone: (objects: any[]) => void;
    private onFindObject: (event: MouseEvent) => void;
    private canvas: SVG.Container;
    private initialized: boolean;
    private states: any[]; // are being merged
    private highlightedShapes: Record<number, SVG.Shape>;
    private constraints: {
        labelID: number;
        shapeType: string;
    };

    private addConstraints(): void {
        const shape = this.states[0];
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
        for (const state of this.states) {
            const shape = this.highlightedShapes[state.clientID];
            shape.removeClass('cvat_canvas_shape_merging');
        }
        this.states = [];
        this.highlightedShapes = {};
        this.initialized = false;
    }

    private initMerging(): void {
        this.canvas.node.addEventListener('click', this.onFindObject);
        this.initialized = true;
    }

    private closeMerging(): void {
        if (this.initialized) {
            const { states } = this;
            this.release();

            if (states.length > 1) {
                this.onMergeDone(states);
            } else {
                this.onMergeDone(null);
                // here is a cycle
                // onMergeDone => controller => model => view => closeMerging
                // one call of closeMerging is unuseful, but it's okey
            }
        }
    }

    public constructor(
        onMergeDone: (objects: any[]) => void,
        onFindObject: (event: MouseEvent) => void,
        canvas: SVG.Container,
    ) {
        this.onMergeDone = onMergeDone;
        this.onFindObject = onFindObject;
        this.canvas = canvas;
        this.states = [];
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
        const stateIndexes = this.states.map((state): number => state.clientID);
        const stateFrames = this.states.map((state): number => state.frame);
        const includes = stateIndexes.indexOf(objectState.clientID);
        if (includes !== -1) {
            const shape = this.highlightedShapes[objectState.clientID];
            this.states.splice(includes, 1);
            if (shape) {
                delete this.highlightedShapes[objectState.clientID];
                shape.removeClass('cvat_canvas_shape_merging');
            }

            if (!this.states.length) {
                this.removeConstraints();
            }
        } else {
            const shape = this.canvas.select(`#cvat_canvas_shape_${objectState.clientID}`).first();
            if (shape && this.checkConstraints(objectState)
            && !stateFrames.includes(objectState.frame)) {
                this.states.push(objectState);
                this.highlightedShapes[objectState.clientID] = shape;
                shape.addClass('cvat_canvas_shape_merging');

                if (this.states.length === 1) {
                    this.addConstraints();
                }
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
