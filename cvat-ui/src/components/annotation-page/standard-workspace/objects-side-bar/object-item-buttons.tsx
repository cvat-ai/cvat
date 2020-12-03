// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';

import { ObjectType, ShapeType } from 'reducers/interfaces';
import {
    ObjectOutsideIcon, FirstIcon, LastIcon, PreviousIcon, NextIcon,
} from 'icons';

interface Props {
    readonly: boolean;
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

const classes = {
    firstKeyFrame: { className: 'cvat-object-item-button-first-keyframe' },
    prevKeyFrame: { className: 'cvat-object-item-button-prev-keyframe' },
    nextKeyFrame: { className: 'cvat-object-item-button-next-keyframe' },
    lastKeyFrame: { className: 'cvat-object-item-button-last-keyframe' },
    outside: {
        enabled: { className: 'cvat-object-item-button-outside cvat-object-item-button-outside-enabled' },
        disabled: { className: 'cvat-object-item-button-outside' },
    },
    lock: {
        enabled: { className: 'cvat-object-item-button-lock cvat-object-item-button-lock-enabled' },
        disabled: { className: 'cvat-object-item-button-lock' },
    },
    occluded: {
        enabled: { className: 'cvat-object-item-button-occluded cvat-object-item-button-occluded-enabled' },
        disabled: { className: 'cvat-object-item-button-occluded' },
    },
    pinned: {
        enabled: { className: 'cvat-object-item-button-pinned cvat-object-item-button-pinned-enabled' },
        disabled: { className: 'cvat-object-item-button-pinned' },
    },
    hidden: {
        enabled: { className: 'cvat-object-item-button-hidden cvat-object-item-button-hidden-enabled' },
        disabled: { className: 'cvat-object-item-button-hidden' },
    },
    keyframe: {
        enabled: { className: 'cvat-object-item-button-keyframe cvat-object-item-button-keyframe-enabled' },
        disabled: { className: 'cvat-object-item-button-keyframe' },
    },
};

function NavigateFirstKeyframe(props: Props): JSX.Element {
    const { navigateFirstKeyframe } = props;
    return navigateFirstKeyframe ? (
        <Icon {...classes.firstKeyFrame} component={FirstIcon} onClick={navigateFirstKeyframe} />
    ) : (
        <Icon {...classes.firstKeyFrame} component={FirstIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
    );
}

function NavigatePrevKeyframe(props: Props): JSX.Element {
    const { prevKeyFrameShortcut, navigatePrevKeyframe } = props;
    return navigatePrevKeyframe ? (
        <Tooltip title={`Go to previous keyframe ${prevKeyFrameShortcut}`} mouseLeaveDelay={0}>
            <Icon {...classes.prevKeyFrame} component={PreviousIcon} onClick={navigatePrevKeyframe} />
        </Tooltip>
    ) : (
        <Icon {...classes.prevKeyFrame} component={PreviousIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
    );
}

function NavigateNextKeyframe(props: Props): JSX.Element {
    const { navigateNextKeyframe, nextKeyFrameShortcut } = props;
    return navigateNextKeyframe ? (
        <Tooltip title={`Go to next keyframe ${nextKeyFrameShortcut}`} mouseLeaveDelay={0}>
            <Icon {...classes.nextKeyFrame} component={NextIcon} onClick={navigateNextKeyframe} />
        </Tooltip>
    ) : (
        <Icon {...classes.nextKeyFrame} component={NextIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
    );
}

function NavigateLastKeyframe(props: Props): JSX.Element {
    const { navigateLastKeyframe } = props;
    return navigateLastKeyframe ? (
        <Icon {...classes.lastKeyFrame} component={LastIcon} onClick={navigateLastKeyframe} />
    ) : (
        <Icon {...classes.lastKeyFrame} component={LastIcon} style={{ opacity: 0.5, pointerEvents: 'none' }} />
    );
}

function SwitchLock(props: Props): JSX.Element {
    const {
        locked, switchLockShortcut, lock, unlock,
    } = props;
    return (
        <Tooltip title={`Switch lock property ${switchLockShortcut}`} mouseLeaveDelay={0}>
            {locked ? (
                <Icon {...classes.lock.enabled} type='lock' theme='filled' onClick={unlock} />
            ) : (
                <Icon {...classes.lock.disabled} type='unlock' onClick={lock} />
            )}
        </Tooltip>
    );
}

function SwitchOccluded(props: Props): JSX.Element {
    const {
        switchOccludedShortcut, occluded, unsetOccluded, setOccluded,
    } = props;
    return (
        <Tooltip title={`Switch occluded property ${switchOccludedShortcut}`} mouseLeaveDelay={0}>
            {occluded ? (
                <Icon {...classes.occluded.enabled} type='team' onClick={unsetOccluded} />
            ) : (
                <Icon {...classes.occluded.disabled} type='user' onClick={setOccluded} />
            )}
        </Tooltip>
    );
}

function SwitchPinned(props: Props): JSX.Element {
    const { pinned, pin, unpin } = props;
    return (
        <Tooltip title='Switch pinned property' mouseLeaveDelay={0}>
            {pinned ? (
                <Icon {...classes.pinned.enabled} type='pushpin' theme='filled' onClick={unpin} />
            ) : (
                <Icon {...classes.pinned.disabled} type='pushpin' onClick={pin} />
            )}
        </Tooltip>
    );
}

function SwitchHidden(props: Props): JSX.Element {
    const {
        switchHiddenShortcut, hidden, hiddenDisabled, show, hide,
    } = props;
    const hiddenStyle = hiddenDisabled ? { opacity: 0.5, pointerEvents: 'none' as const } : {};
    return (
        <Tooltip title={`Switch hidden property ${switchHiddenShortcut}`} mouseLeaveDelay={0}>
            {hidden ? (
                <Icon
                    {...classes.hidden.enabled}
                    type='eye-invisible'
                    theme='filled'
                    onClick={show}
                    style={hiddenStyle}
                />
            ) : (
                <Icon {...classes.hidden.disabled} type='eye' onClick={hide} style={hiddenStyle} />
            )}
        </Tooltip>
    );
}

function SwitchOutside(props: Props): JSX.Element {
    const {
        outside, switchOutsideShortcut, outsideDisabled, unsetOutside, setOutside,
    } = props;
    const outsideStyle = outsideDisabled ? { opacity: 0.5, pointerEvents: 'none' as const } : {};
    return (
        <Tooltip title={`Switch outside property ${switchOutsideShortcut}`} mouseLeaveDelay={0}>
            {outside ? (
                <Icon
                    {...classes.outside.enabled}
                    component={ObjectOutsideIcon}
                    onClick={unsetOutside}
                    style={outsideStyle}
                />
            ) : (
                <Icon {...classes.outside.disabled} type='select' onClick={setOutside} style={outsideStyle} />
            )}
        </Tooltip>
    );
}

function SwitchKeyframe(props: Props): JSX.Element {
    const {
        keyframe, switchKeyFrameShortcut, keyframeDisabled, unsetKeyframe, setKeyframe,
    } = props;
    const keyframeStyle = keyframeDisabled ? { opacity: 0.5, pointerEvents: 'none' as const } : {};
    return (
        <Tooltip title={`Switch keyframe property ${switchKeyFrameShortcut}`} mouseLeaveDelay={0}>
            {keyframe ? (
                <Icon
                    {...classes.keyframe.enabled}
                    type='star'
                    theme='filled'
                    onClick={unsetKeyframe}
                    style={keyframeStyle}
                />
            ) : (
                <Icon {...classes.keyframe.disabled} type='star' onClick={setKeyframe} style={keyframeStyle} />
            )}
        </Tooltip>
    );
}

function ItemButtonsComponent(props: Props): JSX.Element {
    const { readonly, objectType, shapeType } = props;

    if (objectType === ObjectType.TRACK) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            <NavigateFirstKeyframe {...props} />
                        </Col>
                        <Col>
                            <NavigatePrevKeyframe {...props} />
                        </Col>
                        <Col>
                            <NavigateNextKeyframe {...props} />
                        </Col>
                        <Col>
                            <NavigateLastKeyframe {...props} />
                        </Col>
                    </Row>
                    {!readonly && (
                        <Row type='flex' justify='space-around'>
                            <Col>
                                <SwitchOutside {...props} />
                            </Col>
                            <Col>
                                <SwitchLock {...props} />
                            </Col>
                            <Col>
                                <SwitchOccluded {...props} />
                            </Col>
                            <Col>
                                <SwitchHidden {...props} />
                            </Col>
                            <Col>
                                <SwitchKeyframe {...props} />
                            </Col>
                            {shapeType !== ShapeType.POINTS && (
                                <Col>
                                    <SwitchPinned {...props} />
                                </Col>
                            )}
                        </Row>
                    )}
                </Col>
            </Row>
        );
    }

    if (readonly) {
        return <div />;
    }

    if (objectType === ObjectType.TAG) {
        return (
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row type='flex' justify='space-around'>
                        <Col>
                            <SwitchLock {...props} />
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
                        <SwitchLock {...props} />
                    </Col>
                    <Col>
                        <SwitchOccluded {...props} />
                    </Col>
                    <Col>
                        <SwitchHidden {...props} />
                    </Col>
                    {shapeType !== ShapeType.POINTS && (
                        <Col>
                            <SwitchPinned {...props} />
                        </Col>
                    )}
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(ItemButtonsComponent);
