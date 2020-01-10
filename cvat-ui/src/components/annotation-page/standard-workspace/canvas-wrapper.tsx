import React from 'react';

import {
    Layout,
} from 'antd';

import {
    GridColor,
} from '../../../reducers/interfaces';

import { Canvas } from '../../../canvas';

interface Props {
    canvasInstance: Canvas;
    jobInstance: any;
    annotations: any[];
    frameData: any;
    grid: boolean;
    gridSize: number;
    gridColor: GridColor;
    gridOpacity: number;
    onSetupCanvas: () => void;
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

    private initialSetup(): void {
        const {
            grid,
            gridSize,
            gridColor,
            gridOpacity,
            canvasInstance,
            jobInstance,
            onSetupCanvas,
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
