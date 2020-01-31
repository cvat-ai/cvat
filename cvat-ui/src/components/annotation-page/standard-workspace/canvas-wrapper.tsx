import React from 'react';

import {
    Layout,
} from 'antd';

import {
    GridColor,
    ObjectType,
} from 'reducers/interfaces';

import {
    Canvas,
} from 'cvat-canvas';

import getCore from 'cvat-core';

const cvat = getCore();

const MAX_DISTANCE_TO_OPEN_SHAPE = 50;

interface Props {
    sidebarCollapsed: boolean;
    canvasInstance: Canvas;
    jobInstance: any;
    annotations: any[];
    frameData: any;
    frame: number;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    activeLabelID: number;
    activeObjectType: ObjectType;
    onSetupCanvas: () => void;
    onDragCanvas: (enabled: boolean) => void;
    onZoomCanvas: (enabled: boolean) => void;
    onMergeObjects: (enabled: boolean) => void;
    onGroupObjects: (enabled: boolean) => void;
    onSplitTrack: (enabled: boolean) => void;
    onShapeDrawn: () => void;
    onResetCanvas: () => void;
    onUpdateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onCreateAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onMergeAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onGroupAnnotations(sessionInstance: any, frame: number, states: any[]): void;
    onSplitAnnotations(sessionInstance: any, frame: number, state: any): void;
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const {
            canvasInstance,
        } = this.props;

        // It's awful approach from the point of view React
        // But we do not have another way because cvat-canvas returns regular DOM element
        const [wrapper] = window.document
            .getElementsByClassName('cvat-canvas-container');
        wrapper.appendChild(canvasInstance.html());

        this.initialSetup();
        this.updateCanvas();
    }

    public componentDidUpdate(prevProps: Props): void {
        const {
            grid,
            gridSize,
            gridColor,
            gridOpacity,
            canvasInstance,
            sidebarCollapsed,
        } = this.props;

        if (prevProps.sidebarCollapsed !== sidebarCollapsed) {
            const [sidebar] = window.document.getElementsByClassName('cvat-objects-sidebar');
            if (sidebar) {
                sidebar.addEventListener('transitionend', () => {
                    canvasInstance.fitCanvas();
                }, { once: true });
            }
        }

        if (prevProps.grid !== grid) {
            const gridElement = window.document.getElementById('cvat_canvas_grid');
            if (gridElement) {
                gridElement.style.display = grid ? 'block' : 'none';
            }
        }

        if (prevProps.gridSize !== gridSize) {
            canvasInstance.grid(gridSize, gridSize);
        }

        if (prevProps.gridColor !== gridColor) {
            const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
            if (gridPattern) {
                gridPattern.style.stroke = gridColor.toLowerCase();
            }
        }

        if (prevProps.gridOpacity !== gridOpacity) {
            const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
            if (gridPattern) {
                gridPattern.style.opacity = `${gridOpacity / 100}`;
            }
        }

        this.updateCanvas();
    }

    private async onShapeDrawn(event: any): Promise<void> {
        const {
            jobInstance,
            activeLabelID,
            activeObjectType,
            frame,
            onShapeDrawn,
            onCreateAnnotations,
        } = this.props;

        onShapeDrawn();

        const { state } = event.detail;
        if (!state.objectType) {
            state.objectType = activeObjectType;
        }

        if (!state.label) {
            [state.label] = jobInstance.task.labels
                .filter((label: any) => label.id === activeLabelID);
        }

        if (!state.occluded) {
            state.occluded = false;
        }

        state.frame = frame;
        const objectState = new cvat.classes.ObjectState(state);
        onCreateAnnotations(jobInstance, frame, [objectState]);
    }

    private async onShapeEdited(event: any): Promise<void> {
        const {
            jobInstance,
            frame,
            onUpdateAnnotations,
        } = this.props;

        const {
            state,
            points,
        } = event.detail;
        state.points = points;
        onUpdateAnnotations(jobInstance, frame, [state]);
    }

    private async onObjectsMerged(event: any): Promise<void> {
        const {
            jobInstance,
            frame,
            onMergeAnnotations,
            onMergeObjects,
        } = this.props;

        onMergeObjects(false);

        const { states } = event.detail;
        onMergeAnnotations(jobInstance, frame, states);
    }

    private async onObjectsGroupped(event: any): Promise<void> {
        const {
            jobInstance,
            frame,
            onGroupAnnotations,
            onGroupObjects,
        } = this.props;

        onGroupObjects(false);

        const { states } = event.detail;
        onGroupAnnotations(jobInstance, frame, states);
    }

    private async onTrackSplitted(event: any): Promise<void> {
        const {
            jobInstance,
            frame,
            onSplitAnnotations,
            onSplitTrack,
        } = this.props;

        onSplitTrack(false);

        const { state } = event.detail;
        onSplitAnnotations(jobInstance, frame, state);
    }

    private updateCanvas(): void {
        const {
            annotations,
            frameData,
            canvasInstance,
        } = this.props;

        if (frameData !== null) {
            canvasInstance.setup(frameData, annotations);
        }
    }

    private initialSetup(): void {
        const {
            grid,
            gridSize,
            gridColor,
            gridOpacity,
            canvasInstance,
            jobInstance,
            onSetupCanvas,
            onDragCanvas,
            onZoomCanvas,
            onResetCanvas,
        } = this.props;

        // Size
        canvasInstance.fitCanvas();

        // Grid
        const gridElement = window.document.getElementById('cvat_canvas_grid');
        const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
        if (gridElement) {
            gridElement.style.display = grid ? 'block' : 'none';
        }
        if (gridPattern) {
            gridPattern.style.stroke = gridColor.toLowerCase();
            gridPattern.style.opacity = `${gridOpacity / 100}`;
        }
        canvasInstance.grid(gridSize, gridSize);

        // Events
        canvasInstance.html().addEventListener('canvas.setup', (): void => {
            onSetupCanvas();
        });

        canvasInstance.html().addEventListener('canvas.setup', () => {
            canvasInstance.fit();
        }, { once: true });

        canvasInstance.html().addEventListener('canvas.canceled', () => {
            onResetCanvas();
        });

        canvasInstance.html().addEventListener('canvas.dragstart', () => {
            onDragCanvas(true);
        });

        canvasInstance.html().addEventListener('canvas.dragstop', () => {
            onDragCanvas(false);
        });

        canvasInstance.html().addEventListener('canvas.zoomstart', () => {
            onZoomCanvas(true);
        });

        canvasInstance.html().addEventListener('canvas.zoomstop', () => {
            onZoomCanvas(false);
        });

        canvasInstance.html().addEventListener('canvas.moved', async (event: any): Promise<void> => {
            const result = await jobInstance.annotations.select(
                event.detail.states,
                event.detail.x,
                event.detail.y,
            );

            if (result && result.state) {
                if (result.state.shapeType === 'polyline' || result.state.shapeType === 'points') {
                    if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                        return;
                    }
                }

                canvasInstance.activate(result.state.clientID);
            }
        });

        canvasInstance.html().addEventListener('canvas.find', async (e: any) => {
            const result = await jobInstance.annotations
                .select(e.detail.states, e.detail.x, e.detail.y);

            if (result && result.state) {
                if (result.state.shapeType === 'polyline' || result.state.shapeType === 'points') {
                    if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                        return;
                    }
                }

                canvasInstance.select(result.state);
            }
        });

        canvasInstance.html().addEventListener('canvas.edited', this.onShapeEdited.bind(this));
        canvasInstance.html().addEventListener('canvas.drawn', this.onShapeDrawn.bind(this));
        canvasInstance.html().addEventListener('canvas.merged', this.onObjectsMerged.bind(this));
        canvasInstance.html().addEventListener('canvas.groupped', this.onObjectsGroupped.bind(this));
        canvasInstance.html().addEventListener('canvas.splitted', this.onTrackSplitted.bind(this));
    }

    public render(): JSX.Element {
        return (
            // This element doesn't have any props
            // So, React isn't going to rerender it
            // And it's a reason why cvat-canvas appended in mount function works
            <Layout.Content
                className='cvat-canvas-container'
            />
        );
    }
}
