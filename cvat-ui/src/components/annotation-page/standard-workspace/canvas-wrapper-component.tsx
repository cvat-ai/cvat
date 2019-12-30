import React from 'react';

import {
    Layout,
} from 'antd';

import { Canvas } from '../../../../../cvat-canvas/src/typescript/canvas';

interface Props {
    jobInstance: any;
    canvas: Canvas;
    frame: number | null;
    onSetupCanvas(): void;
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    public componentDidMount(): void {
        const {
            jobInstance,
            onSetupCanvas,
            canvas,
        } = this.props;

        // It's awful approach from the point of view React
        // But we do not have any choice because cvat-canvas returns regular DOM element
        const [wrapper] = window.document
            .getElementsByClassName('cvat-annotation-page-canvas-container');
        wrapper.appendChild(canvas.html());
        canvas.updateSize();


        canvas.html().addEventListener('canvas.setup', () => {
            onSetupCanvas();
            if (jobInstance.task.mode === 'annotation') {
                canvas.fit();
            }
        });

        canvas.html().addEventListener('canvas.setup', () => {
            canvas.fit();
        }, { once: true });

        this.updateCanvas();
    }

    public componentDidUpdate(): void {
        this.updateCanvas();
    }

    private updateCanvas(): void {
        const {
            jobInstance,
            frame,
            canvas,
        } = this.props;

        if (frame !== null) {
            Promise.all([

                jobInstance.frames.get(frame),
                jobInstance.annotations.get(frame),
            ]).then(([frameData, annotations]) => {
                canvas.setup(frameData, annotations);
            }).catch((error: any) => {
                console.log(error);
            });
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
