// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import { ObjectType } from 'reducers/interfaces';
import {
    FirstIcon, LastIcon, PreviousIcon, NextIcon,
} from 'icons';

interface Props {
    objectType: ObjectType;
    nextKeyFrameShortcut: string;
    prevKeyFrameShortcut: string;

    navigateFirstKeyframe: null | (() => void);
    navigatePrevKeyframe: null | (() => void);
    navigateNextKeyframe: null | (() => void);
    navigateLastKeyframe: null | (() => void);
}

function ItemButtonsComponent(props: Props): JSX.Element | null {
    const {
        objectType,
        nextKeyFrameShortcut,
        prevKeyFrameShortcut,

        navigateFirstKeyframe,
        navigatePrevKeyframe,
        navigateNextKeyframe,
        navigateLastKeyframe,
    } = props;

    if (objectType === ObjectType.TRACK) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            {navigateFirstKeyframe ? (
                                <Icon component={FirstIcon} onClick={navigateFirstKeyframe} />
                            ) : (
                                <Icon component={FirstIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
                            )}
                        </Col>
                        <Col>
                            {navigatePrevKeyframe ? (
                                <Tooltip title={`Go to previous keyframe ${prevKeyFrameShortcut}`} mouseLeaveDelay={0}>
                                    <Icon component={PreviousIcon} onClick={navigatePrevKeyframe} />
                                </Tooltip>
                            ) : (
                                <Icon component={PreviousIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
                            )}
                        </Col>
                        <Col>
                            {navigateNextKeyframe ? (
                                <Tooltip title={`Go to next keyframe ${nextKeyFrameShortcut}`} mouseLeaveDelay={0}>
                                    <Icon component={NextIcon} onClick={navigateNextKeyframe} />
                                </Tooltip>
                            ) : (
                                <Icon component={NextIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
                            )}
                        </Col>
                        <Col>
                            {navigateLastKeyframe ? (
                                <Icon component={LastIcon} onClick={navigateLastKeyframe} />
                            ) : (
                                <Icon component={LastIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
                            )}
                        </Col>
                    </Row>
                </Col>
            </Row>
        );
    }

    return null;
}

export default React.memo(ItemButtonsComponent);
