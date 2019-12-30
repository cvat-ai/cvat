import './styles.scss';
import React from 'react';

import {
    Layout,
} from 'antd';

import { Canvas } from '../../../../../cvat-canvas/src/typescript/canvas';

import ControlsSideBarComponent from './controls-side-bar';
import CanvasWrapperComponent from './canvas-wrapper-component';
import ObjectSideBarComponent from './objects-side-bar/objects-side-bar';

interface Props {
    jobInstance: any;
    frame: number | null;
    onSetupCanvas(): void;
}

interface State {
    canvas: Canvas;
}

export default class StandardWorkspaceComponent extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            canvas: new Canvas(),
        };
    }

    public render(): JSX.Element {
        const {
            jobInstance,
            frame,
            onSetupCanvas,
        } = this.props;

        const { canvas } = this.state;

        return (
            <Layout hasSider>
                <ControlsSideBarComponent />
                <CanvasWrapperComponent
                    jobInstance={jobInstance}
                    frame={frame}
                    onSetupCanvas={onSetupCanvas}
                    canvas={canvas}
                />
                <ObjectSideBarComponent
                    onSidebarFoldUnfold={(): void => {
                        canvas.updateSize();
                    }}
                />
            </Layout>
        );
    }
}
