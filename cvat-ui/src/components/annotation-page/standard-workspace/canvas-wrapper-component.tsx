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
    private canvas: Canvas;

    public constructor(props: Props) {
        super(props);
        this.canvas = new Canvas();
    }

    public componentDidMount(): void {
        const {
            onSetupCanvas,
        } = this.props;

        const [wrapper] = window.document.getElementsByClassName('cvat-annotation-page-canvas-container');
        wrapper.appendChild(this.canvas.html());
        this.canvas.html().addEventListener('canvas.setup', () => {
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
                        // TODO: jobInstance.annotations.get(frame) requires meta information and there is an error
                    }))
                .catch((error: any) => {
                    console.log(error);
                });
        }
    }

    public render(): JSX.Element {
        return (
            <Layout.Content
                className='cvat-annotation-page-canvas-container'
            >

            </Layout.Content>
        );
    }
}
