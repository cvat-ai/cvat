import React from 'react';

import {
    Layout,
} from 'antd';

import {
    GridColor,
} from '../../../reducers/interfaces';

import {
    Canvas,
} from '../../../canvas';

interface Props {
    canvasInstance: Canvas;
    jobInstance: any;
    annotations: any[];
    frameData: any;
    frame: number;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    onSetupCanvas: () => void;
    onDragCanvas: (enabled: boolean) => void;
    onZoomCanvas: (enabled: boolean) => void;
    onResetCanvas: () => void;
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const {
            canvasInstance,
        } = this.props;

        // It's awful approach from the point of view React
        // But we do not have another way because cvat-canvas returns regular DOM element
        const [wrapper] = window.document
            .getElementsByClassName('cvat-annotation-page-canvas-container');
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
        } = this.props;

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

    private async onShapeEdit(event: any): Promise<void> {
        const {
            canvasInstance,
            jobInstance,
            frameData,
            frame,
        } = this.props;

        const {
            state,
            points,
        } = event.detail;
        state.points = points;
        state.save();

        const annotations = await jobInstance.annotations.get(frame);
        canvasInstance.setup(frameData, annotations);
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
            if (jobInstance.task.mode === 'annotation') {
                canvasInstance.fit();
            }
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
            const threshold = 50;
            const result = await jobInstance.annotations.select(
                event.detail.states,
                event.detail.x,
                event.detail.y,
            );

            if (result && result.state) {
                if (result.state.shapeType === 'polyline' || result.state.shapeType === 'points') {
                    if (result.distance > threshold) {
                        return;
                    }
                }

                canvasInstance.activate(result.state.clientID);
            }
        });

        canvasInstance.html().addEventListener('canvas.edited', this.onShapeEdit.bind(this));
    }

    public render(): JSX.Element {
        return (
            // This element doesn't have any props
            // So, React isn't going to rerender it
            // And it's a reason why cvat-canvas appended in mount function works
            <Layout.Content
                className='cvat-annotation-page-canvas-container'
            />
        );
    }
}
