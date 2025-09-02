// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon, {
    UnlockOutlined,
    LockFilled,
    TeamOutlined,
    UserOutlined,
    PushpinFilled,
    PushpinOutlined,
    EyeInvisibleFilled,
    StarFilled,
    SelectOutlined,
    StarOutlined,
    EyeOutlined,
} from '@ant-design/icons';

import CVATTooltip from 'components/common/cvat-tooltip';
import { ObjectType, ShapeType } from 'cvat-core-wrapper';
import {
    ObjectOutsideIcon, FirstIcon, LastIcon, PreviousIcon, NextIcon,
} from 'icons';

interface Props {
    readonly: boolean;
    parentID: number | null;
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
    switchPinnedShortcut: string;
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

const disabledStyle = { opacity: 0.5, pointerEvents: 'none' as const };

function NavigateFirstKeyframe(props: Props): JSX.Element {
    const { navigateFirstKeyframe } = props;
    return navigateFirstKeyframe ? (
        <Icon {...classes.firstKeyFrame} component={FirstIcon} onClick={navigateFirstKeyframe} />
    ) : (
        <Icon {...classes.firstKeyFrame} component={FirstIcon} style={disabledStyle} />
    );
}

function NavigatePrevKeyframe(props: Props): JSX.Element {
    const { prevKeyFrameShortcut, navigatePrevKeyframe } = props;
    return navigatePrevKeyframe ? (
        <CVATTooltip title={`Go to previous keyframe ${prevKeyFrameShortcut}`}>
            <Icon {...classes.prevKeyFrame} component={PreviousIcon} onClick={navigatePrevKeyframe} />
        </CVATTooltip>
    ) : (
        <Icon {...classes.prevKeyFrame} component={PreviousIcon} style={disabledStyle} />
    );
}

function NavigateNextKeyframe(props: Props): JSX.Element {
    const { navigateNextKeyframe, nextKeyFrameShortcut } = props;
    return navigateNextKeyframe ? (
        <CVATTooltip title={`Go to next keyframe ${nextKeyFrameShortcut}`}>
            <Icon {...classes.nextKeyFrame} component={NextIcon} onClick={navigateNextKeyframe} />
        </CVATTooltip>
    ) : (
        <Icon {...classes.nextKeyFrame} component={NextIcon} style={disabledStyle} />
    );
}

function NavigateLastKeyframe(props: Props): JSX.Element {
    const { navigateLastKeyframe } = props;
    return navigateLastKeyframe ? (
        <Icon {...classes.lastKeyFrame} component={LastIcon} onClick={navigateLastKeyframe} />
    ) : (
        <Icon {...classes.lastKeyFrame} component={LastIcon} style={disabledStyle} />
    );
}

function SwitchLock(props: Props): JSX.Element {
    const {
        locked, switchLockShortcut, lock, unlock,
    } = props;
    return (
        <CVATTooltip title={`Switch lock property ${switchLockShortcut}`}>
            {locked ? (
                <LockFilled {...classes.lock.enabled} onClick={unlock} />
            ) : (
                <UnlockOutlined {...classes.lock.disabled} onClick={lock} />
            )}
        </CVATTooltip>
    );
}

function SwitchOccluded(props: Props): JSX.Element {
    const {
        switchOccludedShortcut, locked, occluded, unsetOccluded, setOccluded,
    } = props;

    const style = locked ? disabledStyle : {};
    return (
        <CVATTooltip title={`Switch occluded property ${switchOccludedShortcut}`}>
            {occluded ? (
                <TeamOutlined
                    {...classes.occluded.enabled}
                    onClick={locked ? undefined : unsetOccluded}
                    style={style}
                />
            ) : (
                <UserOutlined
                    {...classes.occluded.disabled}
                    onClick={locked ? undefined : setOccluded}
                    style={style}
                />
            )}
        </CVATTooltip>
    );
}

function SwitchPinned(props: Props): JSX.Element {
    const {
        switchPinnedShortcut, locked, pinned, pin, unpin,
    } = props;

    const style = locked ? disabledStyle : {};
    return (
        <CVATTooltip title={`Switch pinned property ${switchPinnedShortcut}`}>
            {pinned ? (
                <PushpinFilled
                    {...classes.pinned.enabled}
                    onClick={locked ? undefined : unpin}
                    style={style}
                />
            ) : (
                <PushpinOutlined
                    {...classes.pinned.disabled}
                    onClick={locked ? undefined : pin}
                    style={style}
                />
            )}
        </CVATTooltip>
    );
}

function SwitchHidden(props: Props): JSX.Element {
    const {
        switchHiddenShortcut, locked, hidden, hiddenDisabled, show, hide,
    } = props;

    const style = hiddenDisabled || locked ? disabledStyle : {};
    return (
        <CVATTooltip title={`Switch hidden property ${switchHiddenShortcut}`}>
            {hidden ? (
                <EyeInvisibleFilled
                    {...classes.hidden.enabled}
                    onClick={hiddenDisabled || locked ? undefined : show}
                    style={style}
                />
            ) : (
                <EyeOutlined
                    {...classes.hidden.disabled}
                    onClick={hiddenDisabled || locked ? undefined : hide}
                    style={style}
                />
            )}
        </CVATTooltip>
    );
}

function SwitchOutside(props: Props): JSX.Element {
    const {
        outside, locked, switchOutsideShortcut, outsideDisabled, unsetOutside, setOutside,
    } = props;

    const style = outsideDisabled || locked ? disabledStyle : {};
    return (
        <CVATTooltip title={`Switch outside property ${switchOutsideShortcut}`}>
            {outside ? (
                <Icon
                    {...classes.outside.enabled}
                    component={ObjectOutsideIcon}
                    onClick={outsideDisabled || locked ? undefined : unsetOutside}
                    style={style}
                />
            ) : (
                <SelectOutlined
                    {...classes.outside.disabled}
                    onClick={outsideDisabled || locked ? undefined : setOutside}
                    style={style}
                />
            )}
        </CVATTooltip>
    );
}

function SwitchKeyframe(props: Props): JSX.Element {
    const {
        keyframe, locked, switchKeyFrameShortcut, keyframeDisabled, unsetKeyframe, setKeyframe,
    } = props;

    const style = keyframeDisabled || locked ? disabledStyle : {};
    return (
        <CVATTooltip title={`Switch keyframe property ${switchKeyFrameShortcut}`}>
            {keyframe ? (
                <StarFilled
                    style={style}
                    onClick={keyframeDisabled || locked ? undefined : unsetKeyframe}
                    {...classes.keyframe.enabled}
                />
            ) : (
                <StarOutlined
                    style={style}
                    onClick={keyframeDisabled || locked ? undefined : setKeyframe}
                    {...classes.keyframe.disabled}
                />
            )}
        </CVATTooltip>
    );
}

function ItemButtonsComponent(props: Props): JSX.Element {
    const {
        readonly, objectType, shapeType, parentID,
    } = props;

    if (objectType === ObjectType.TRACK) {
        return (
            <Row align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    <Row justify='space-around'>
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
                    {readonly ? (
                        <Row justify='space-around'>
                            <Col>
                                <SwitchHidden {...props} />
                            </Col>
                        </Row>
                    ) : (
                        <Row justify='space-around'>
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

    if (objectType === ObjectType.SHAPE) {
        return (
            <Row align='middle' justify='space-around'>
                <Col span={20} style={{ textAlign: 'center' }}>
                    { readonly ? (
                        <Row justify='space-around'>
                            <Col>
                                <SwitchHidden {...props} />
                            </Col>
                        </Row>
                    ) : (
                        <Row justify='space-around'>
                            { Number.isInteger(parentID) && (
                                <Col>
                                    <SwitchOutside {...props} />
                                </Col>
                            )}
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
                    )}
                </Col>
            </Row>
        );
    }

    if (readonly) {
        return <div />;
    }

    return (
        <Row align='middle' justify='space-around'>
            <Col span={20} style={{ textAlign: 'center' }}>
                <Row justify='space-around'>
                    <Col>
                        <SwitchLock {...props} />
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}

export default React.memo(ItemButtonsComponent);
