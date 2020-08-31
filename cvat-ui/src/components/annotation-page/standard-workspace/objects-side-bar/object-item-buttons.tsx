// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import {
    ObjectOutsideIcon,
    FirstIcon,
    LastIcon,
    PreviousIcon,
    NextIcon,
} from 'icons';
import { ObjectType, ShapeType } from 'reducers/interfaces';

interface Props {
    objectType: ObjectType;
    shapeType: ShapeType;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;
    outsideDisabled: boolean;
    hiddenDisabled: boolean;
    keyframeDisabled: boolean;
    switchOccludedShortcut: string;
    switchOutsideShortcut: string;
    switchLockShortcut: string;
    switchHiddenShortcut: string;
    switchKeyFrameShortcut: string;
    nextKeyFrameShortcut: string;
    prevKeyFrameShortcut: string;

    navigateFirstKeyframe: null | (() => void);
    navigatePrevKeyframe: null | (() => void);
    navigateNextKeyframe: null | (() => void);
    navigateLastKeyframe: null | (() => void);

    setOccluded(): void;
    unsetOccluded(): void;
    setOutside(): void;
    unsetOutside(): void;
    setKeyframe(): void;
    unsetKeyframe(): void;
    lock(): void;
    unlock(): void;
    pin(): void;
    unpin(): void;
    hide(): void;
    show(): void;
}

function ItemButtonsComponent(props: Props): JSX.Element {
    const {
        objectType,
        shapeType,
        occluded,
        outside,
        locked,
        pinned,
        hidden,
        keyframe,
        outsideDisabled,
        hiddenDisabled,
        keyframeDisabled,
        switchOccludedShortcut,
        switchOutsideShortcut,
        switchLockShortcut,
        switchHiddenShortcut,
        switchKeyFrameShortcut,
        nextKeyFrameShortcut,
        prevKeyFrameShortcut,

        navigateFirstKeyframe,
        navigatePrevKeyframe,
        navigateNextKeyframe,
        navigateLastKeyframe,

        setOccluded,
        unsetOccluded,
        setOutside,
        unsetOutside,
        setKeyframe,
        unsetKeyframe,
        lock,
        unlock,
        pin,
        unpin,
        hide,
        show,
    } = props;

    const outsideStyle = outsideDisabled ? { opacity: 0.5, pointerEvents: 'none' as 'none' } : {};
    const hiddenStyle = hiddenDisabled ? { opacity: 0.5, pointerEvents: 'none' as 'none' } : {};
    const keyframeStyle = keyframeDisabled ? { opacity: 0.5, pointerEvents: 'none' as 'none' } : {};


    if (objectType === ObjectType.TRACK) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            { navigateFirstKeyframe
                                ? <Icon component={FirstIcon} onClick={navigateFirstKeyframe} />
                                : <Icon component={FirstIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col>
                            { navigatePrevKeyframe
                                ? (
                                    <Tooltip title={`Go to previous keyframe ${prevKeyFrameShortcut}`} mouseLeaveDelay={0}>
                                        <Icon
                                            component={PreviousIcon}
                                            onClick={navigatePrevKeyframe}
                                        />
                                    </Tooltip>
                                )
                                : <Icon component={PreviousIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col>
                            { navigateNextKeyframe
                                ? (
                                    <Tooltip title={`Go to next keyframe ${nextKeyFrameShortcut}`} mouseLeaveDelay={0}>
                                        <Icon
                                            component={NextIcon}
                                            onClick={navigateNextKeyframe}
                                        />
                                    </Tooltip>
                                )
                                : <Icon component={NextIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                        <Col>
                            { navigateLastKeyframe
                                ? <Icon component={LastIcon} onClick={navigateLastKeyframe} />
                                : <Icon component={LastIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />}
                        </Col>
                    </Row>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            <Tooltip title={`Switch outside property ${switchOutsideShortcut}`} mouseLeaveDelay={0}>
                                { outside
                                    ? (
                                        <Icon
                                            component={ObjectOutsideIcon}
                                            onClick={unsetOutside}
                                            style={outsideStyle}
                                        />
                                    )
                                    : <Icon type='select' onClick={setOutside} style={outsideStyle} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch lock property ${switchLockShortcut}`} mouseLeaveDelay={0}>
                                { locked
                                    ? <Icon type='lock' theme='filled' onClick={unlock} />
                                    : <Icon type='unlock' onClick={lock} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch occluded property ${switchOccludedShortcut}`} mouseLeaveDelay={0}>
                                { occluded
                                    ? <Icon type='team' onClick={unsetOccluded} />
                                    : <Icon type='user' onClick={setOccluded} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch hidden property ${switchHiddenShortcut}`} mouseLeaveDelay={0}>
                                { hidden
                                    ? <Icon type='eye-invisible' theme='filled' onClick={show} style={hiddenStyle} />
                                    : <Icon type='eye' onClick={hide} style={hiddenStyle} />}
                            </Tooltip>
                        </Col>
                        <Col>
                            <Tooltip title={`Switch keyframe property ${switchKeyFrameShortcut}`} mouseLeaveDelay={0}>
                                { keyframe
                                    ? <Icon type='star' theme='filled' onClick={unsetKeyframe} style={keyframeStyle} />
                                    : <Icon type='star' onClick={setKeyframe} style={keyframeStyle} />}
                            </Tooltip>
                        </Col>
                        {
                            shapeType !== ShapeType.POINTS && (
                                <Col>
                                    <Tooltip title='Switch pinned property' mouseLeaveDelay={0}>
                                        { pinned
                                            ? <Icon type='pushpin' theme='filled' onClick={unpin} />
                                            : <Icon type='pushpin' onClick={pin} />}
                                    </Tooltip>
                                </Col>
                            )
                        }
                    </Row>
                </Col>
            </Row>
        );
    }

    if (objectType === ObjectType.TAG) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            <Tooltip title={`Switch lock property ${switchLockShortcut}`} mouseLeaveDelay={0}>
                                { locked
                                    ? <Icon type='lock' onClick={unlock} theme='filled' />
                                    : <Icon type='unlock' onClick={lock} />}
                            </Tooltip>
                        </Col>
                    </Row>
                </Col>
            </Row>
        );
    }

    return (
        <Row type='flex' align='middle' justify='space-around'>
            <Col span={20} style={{ textAlign: 'center' }}>
                <Row type='flex' justify='space-around'>
                    <Col>
                        <Tooltip title={`Switch lock property ${switchLockShortcut}`} mouseLeaveDelay={0}>
                            { locked
                                ? <Icon type='lock' onClick={unlock} theme='filled' />
                                : <Icon type='unlock' onClick={lock} />}
                        </Tooltip>
                    </Col>
                    <Col>
                        <Tooltip title={`Switch occluded property ${switchOccludedShortcut}`} mouseLeaveDelay={0}>
                            { occluded
                                ? <Icon type='team' onClick={unsetOccluded} />
                                : <Icon type='user' onClick={setOccluded} />}
                        </Tooltip>
                    </Col>
                    <Col>
                        <Tooltip title={`Switch hidden property ${switchHiddenShortcut}`} mouseLeaveDelay={0}>
                            { hidden
                                ? <Icon type='eye-invisible' onClick={show} />
                                : <Icon type='eye' onClick={hide} />}
                        </Tooltip>
                    </Col>
                    {
                        shapeType !== ShapeType.POINTS && (
                            <Col>
                                <Tooltip title='Switch pinned property' mouseLeaveDelay={0}>
                                    { pinned
                                        ? <Icon type='pushpin' theme='filled' onClick={unpin} />
                                        : <Icon type='pushpin' onClick={pin} />}
                                </Tooltip>
                            </Col>
                        )
                    }
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(ItemButtonsComponent);
