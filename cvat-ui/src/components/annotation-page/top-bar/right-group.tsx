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

import {
    InfoIcon,
    FullscreenIcon,
} from '../../../icons';

interface Props {
    showStatistics(): void;
}

function RightGroup(props: Props): JSX.Element {
    const { showStatistics } = props;

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
                <Select disabled className='cvat-workspace-selector' defaultValue='standard'>
                    <Select.Option key='standard' value='standard'>Standard</Select.Option>
                    <Select.Option key='aam' value='aam'>Attribute annotation</Select.Option>
                </Select>
            </div>
        </Col>
    );
}

export default React.memo(RightGroup);
