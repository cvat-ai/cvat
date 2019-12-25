import React from 'react';

import {
    Layout,
} from 'antd';

import { Canvas } from '../../../../../cvat-canvas/src/typescript/canvas';

interface Props {
    jobInstance: any;
    frame: number | null;
    onSetupCanvas(): void;
}

export default class CanvasWrapperComponent extends React.PureComponent<Props> {
    private initializedSize = false;
    public readonly canvas: Canvas;
    public constructor(props: Props) {
        super(props);
        this.canvas = new Canvas();
        this.initializedSize = false;
    }

    public componentDidMount(): void {
        const {
            jobInstance,
            onSetupCanvas,
        } = this.props;

        // It's awful approach from the point of view React
        // But we do not have any choice because cvat-canvas returns regular DOM element
        const [wrapper] = window.document
            .getElementsByClassName('cvat-annotation-page-canvas-container');
        wrapper.appendChild(this.canvas.html());

        this.canvas.html().addEventListener('canvas.setup', () => {
            if (!this.initializedSize) {
                this.initializedSize = true;
                this.canvas.updateSize();
                this.canvas.fit();
            }

            if (jobInstance.task.mode === 'annotation') {
                this.canvas.fit();
            }
            onSetupCanvas();
        });

        this.updateCanvas();
    }

    public componentDidUpdate(): void {
        this.updateCanvas();
    }

    private updateCanvas(): void {
        const {
            jobInstance,
            frame,
        } = this.props;

        if (frame !== null) {
            jobInstance.frames.get(frame)
                .then((frameData: any) => jobInstance.annotations.get(frame)
                    .then((annotations: any[]) => {
                        this.canvas.setup(frameData, annotations);
                    }).catch((error: any) => {
                        console.log(error);
                        // TODO: jobInstance.annotations.get(frame)
                        // requires meta information and there is an error
                    }))
                .catch((error: any) => {
                    console.log(error);
                });
        }
    }

    public render(): JSX.Element {
        return (
            // This element doesn't has any props
            // So, React isn't going to rerender it
            // And it's a reason why cvat-canvas appended in mount function works
            <Layout.Content
                className='cvat-annotation-page-canvas-container'
            />
        );
    }
}
