// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import {
    Col,
    Icon,
    Select,
    Button,
} from 'antd';

import { Workspace } from 'reducers/interfaces';
import { InfoIcon, FullscreenIcon } from '../../../icons';

interface Props {
    workspace: Workspace;
    showStatistics(): void;
    changeWorkspace(workspace: Workspace): void;
}

function RightGroup(props: Props): JSX.Element {
    const { showStatistics, changeWorkspace, workspace } = props;

    return (
        <Col className='cvat-annotation-header-right-group'>
            <Button
                type='link'
                className='cvat-annotation-header-button'
                onClick={(): void => {
                    if (window.document.fullscreenEnabled) {
                        if (window.document.fullscreenElement) {
                            window.document.exitFullscreen();
                        } else {
                            window.document.documentElement.requestFullscreen();
                        }
                    }
                }}
            >
                <Icon component={FullscreenIcon} />
                Fullscreen
            </Button>
            <Button type='link' className='cvat-annotation-header-button' onClick={showStatistics}>
                <Icon component={InfoIcon} />
                Info
            </Button>
            <div>
                <Select
                    className='cvat-workspace-selector'
                    onChange={changeWorkspace}
                    value={workspace}
                >
                    <Select.Option
                        key={Workspace.STANDARD}
                        value={Workspace.STANDARD}
                    >
                        {Workspace.STANDARD}
                    </Select.Option>
                    <Select.Option
                        key={Workspace.ATTRIBUTE_ANNOTATION}
                        value={Workspace.ATTRIBUTE_ANNOTATION}
                    >
                        {Workspace.ATTRIBUTE_ANNOTATION}
                    </Select.Option>
                </Select>
            </div>
        </Col>
    );
}

export default React.memo(RightGroup);
