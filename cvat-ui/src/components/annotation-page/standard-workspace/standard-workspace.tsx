import './styles.scss';
import React from 'react';

import {
    Layout,
} from 'antd';

import ControlsSideBarComponent from './controls-side-bar';
import CanvasWrapperComponent from './canvas-wrapper-component';
import ObjectSideBarComponent from './objects-side-bar/objects-side-bar';

interface Props {
    jobInstance: any;
    frame: number | null;
    onSetupCanvas(): void;
}

export default function StandardWorkspaceComponent(props: Props): JSX.Element {
    const {
        jobInstance,
        frame,
        onSetupCanvas,
    } = props;

    const canvasWrapper = React.createRef<CanvasWrapperComponent>();

    return (
        <Layout>
            <ControlsSideBarComponent />
            <CanvasWrapperComponent
                jobInstance={jobInstance}
                frame={frame}
                onSetupCanvas={onSetupCanvas}
                ref={canvasWrapper}
            />
            <ObjectSideBarComponent
                onSidebarFoldUnfold={(): void => {
                    if (canvasWrapper.current) {
                        canvasWrapper.current.canvas.updateSize();
                        canvasWrapper.current.canvas.fit();
                    }
                }}
            />
        </Layout>
    );
}
