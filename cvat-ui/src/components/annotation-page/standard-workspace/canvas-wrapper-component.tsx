import React from 'react';

import {
    Layout,
} from 'antd';

import { Canvas } from '../../../canvas';

interface Props {
    canvasInstance: Canvas;
    jobInstance: any;
    annotations: any[];
    frameData: any;
    onCanvasSetup: () => void;
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const {
            jobInstance,
            canvasInstance,
            onCanvasSetup,
        } = this.props;

        // It's awful approach from the point of view React
        // But we do not have another way because cvat-canvas returns regular DOM element
        const [wrapper] = window.document
            .getElementsByClassName('cvat-annotation-page-canvas-container');
        wrapper.appendChild(canvasInstance.html());
        canvasInstance.fitCanvas();

        canvasInstance.html().addEventListener('canvas.setup', (): void => {
            onCanvasSetup();
            if (jobInstance.task.mode === 'annotation') {
                canvasInstance.fit();
            }
        });

        canvasInstance.html().addEventListener('canvas.setup', () => {
            canvasInstance.fit();
        }, { once: true });

        this.updateCanvas();
    }

    public componentDidUpdate(): void {
        this.updateCanvas();
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
