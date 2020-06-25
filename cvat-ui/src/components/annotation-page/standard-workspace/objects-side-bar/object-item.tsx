// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';

import ColorChanger from 'components/annotation-page/standard-workspace/objects-side-bar/color-changer';
import { ObjectType, ShapeType } from 'reducers/interfaces';

import ItemDetails, { attrValuesAreEqual } from './object-item-details';
import ItemBasics from './object-item-basics';
import ItemButtons from './object-item-buttons';

interface Props {
    normalizedKeyMap: Record<string, string>;
    activated: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;
    attrValues: Record<number, string>;
    color: string;
    colors: string[];

    labels: any[];
    attributes: any[];
    collapsed: boolean;
    navigateFirstKeyframe: null | (() => void);
    navigatePrevKeyframe: null | (() => void);
    navigateNextKeyframe: null | (() => void);
    navigateLastKeyframe: null | (() => void);

    activate(): void;
    copy(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toForeground(): void;
    remove(): void;
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
    changeLabel(labelID: string): void;
    changeAttribute(attrID: number, value: string): void;
    changeColor(color: string): void;
    collapse(): void;
    resetCuboidPerspective(): void;
}

function objectItemsAreEqual(prevProps: Props, nextProps: Props): boolean {
    return nextProps.activated === prevProps.activated
        && nextProps.locked === prevProps.locked
        && nextProps.pinned === prevProps.pinned
        && nextProps.occluded === prevProps.occluded
        && nextProps.outside === prevProps.outside
        && nextProps.hidden === prevProps.hidden
        && nextProps.keyframe === prevProps.keyframe
        && nextProps.labelID === prevProps.labelID
        && nextProps.color === prevProps.color
        && nextProps.clientID === prevProps.clientID
        && nextProps.serverID === prevProps.serverID
        && nextProps.objectType === prevProps.objectType
        && nextProps.shapeType === prevProps.shapeType
        && nextProps.collapsed === prevProps.collapsed
        && nextProps.labels === prevProps.labels
        && nextProps.attributes === prevProps.attributes
        && nextProps.normalizedKeyMap === prevProps.normalizedKeyMap
        && nextProps.navigateFirstKeyframe === prevProps.navigateFirstKeyframe
        && nextProps.navigatePrevKeyframe === prevProps.navigatePrevKeyframe
        && nextProps.navigateNextKeyframe === prevProps.navigateNextKeyframe
        && nextProps.navigateLastKeyframe === prevProps.navigateLastKeyframe
        && attrValuesAreEqual(nextProps.attrValues, prevProps.attrValues);
}

function ObjectItemComponent(props: Props): JSX.Element {
    const {
        activated,
        objectType,
        shapeType,
        clientID,
        serverID,
        occluded,
        outside,
        locked,
        pinned,
        hidden,
        keyframe,
        attrValues,
        labelID,
        color,
        colors,

        attributes,
        labels,
        collapsed,
        normalizedKeyMap,
        navigateFirstKeyframe,
        navigatePrevKeyframe,
        navigateNextKeyframe,
        navigateLastKeyframe,

        activate,
        copy,
        propagate,
        createURL,
        switchOrientation,
        toBackground,
        toForeground,
        remove,
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
        changeLabel,
        changeAttribute,
        changeColor,
        collapse,
        resetCuboidPerspective,
    } = props;

    const type = objectType === ObjectType.TAG ? ObjectType.TAG.toUpperCase()
        : `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = !activated ? 'cvat-objects-sidebar-state-item'
        : 'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item';

    return (
        <div style={{ display: 'flex', marginBottom: '1px' }}>
            <Popover
                placement='left'
                trigger='click'
                content={(
                    <ColorChanger
                        shortcut={normalizedKeyMap.CHANGE_OBJECT_COLOR}
                        onChange={changeColor}
                        colors={colors}
                    />
                )}
            >
                <div
                    className='cvat-objects-sidebar-state-item-color'
                    style={{ background: `${color}` }}
                />
            </Popover>
            <div
                onMouseEnter={activate}
                id={`cvat-objects-sidebar-state-item-${clientID}`}
                className={className}
                style={{ backgroundColor: `${color}88` }}
            >
                <ItemBasics
                    serverID={serverID}
                    clientID={clientID}
                    labelID={labelID}
                    labels={labels}
                    shapeType={shapeType}
                    objectType={objectType}
                    type={type}
                    locked={locked}
                    copyShortcut={normalizedKeyMap.COPY_SHAPE}
                    pasteShortcut={normalizedKeyMap.PASTE_SHAPE}
                    propagateShortcut={normalizedKeyMap.PROPAGATE_OBJECT}
                    toBackgroundShortcut={normalizedKeyMap.TO_BACKGROUND}
                    toForegroundShortcut={normalizedKeyMap.TO_FOREGROUND}
                    removeShortcut={normalizedKeyMap.DELETE_OBJECT}
                    changeLabel={changeLabel}
                    copy={copy}
                    remove={remove}
                    propagate={propagate}
                    createURL={createURL}
                    switchOrientation={switchOrientation}
                    toBackground={toBackground}
                    toForeground={toForeground}
                    resetCuboidPerspective={resetCuboidPerspective}
                />
                <ItemButtons
                    shapeType={shapeType}
                    objectType={objectType}
                    occluded={occluded}
                    outside={outside}
                    locked={locked}
                    pinned={pinned}
                    hidden={hidden}
                    keyframe={keyframe}
                    switchOccludedShortcut={normalizedKeyMap.SWITCH_OCCLUDED}
                    switchOutsideShortcut={normalizedKeyMap.SWITCH_OUTSIDE}
                    switchLockShortcut={normalizedKeyMap.SWITCH_LOCK}
                    switchHiddenShortcut={normalizedKeyMap.SWITCH_HIDDEN}
                    switchKeyFrameShortcut={normalizedKeyMap.SWITCH_KEYFRAME}
                    nextKeyFrameShortcut={normalizedKeyMap.NEXT_KEY_FRAME}
                    prevKeyFrameShortcut={normalizedKeyMap.PREV_KEY_FRAME}
                    navigateFirstKeyframe={navigateFirstKeyframe}
                    navigatePrevKeyframe={navigatePrevKeyframe}
                    navigateNextKeyframe={navigateNextKeyframe}
                    navigateLastKeyframe={navigateLastKeyframe}
                    setOccluded={setOccluded}
                    unsetOccluded={unsetOccluded}
                    setOutside={setOutside}
                    unsetOutside={unsetOutside}
                    setKeyframe={setKeyframe}
                    unsetKeyframe={unsetKeyframe}
                    lock={lock}
                    unlock={unlock}
                    pin={pin}
                    unpin={unpin}
                    hide={hide}
                    show={show}
                />
                { !!attributes.length
                    && (
                        <ItemDetails
                            collapsed={collapsed}
                            attributes={attributes}
                            values={attrValues}
                            collapse={collapse}
                            changeAttribute={changeAttribute}
                        />
                    )}
            </div>
        </div>
    );
}

export default React.memo(ObjectItemComponent, objectItemsAreEqual);
