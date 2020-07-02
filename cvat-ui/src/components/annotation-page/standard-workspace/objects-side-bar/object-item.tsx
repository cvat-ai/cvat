// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';

import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ColorChanger from 'components/annotation-page/standard-workspace/objects-side-bar/color-changer';
import { ObjectType, ShapeType } from 'reducers/interfaces';
import ItemDetails, { attrValuesAreEqual } from './object-item-details';
import ItemBasics from './object-item-basics';


interface Props {
    normalizedKeyMap: Record<string, string>;
    activated: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    locked: boolean;
    attrValues: Record<number, string>;
    color: string;
    colors: string[];

    labels: any[];
    attributes: any[];
    collapsed: boolean;

    activate(): void;
    copy(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toForeground(): void;
    remove(): void;
    changeLabel(labelID: string): void;
    changeAttribute(attrID: number, value: string): void;
    changeColor(color: string): void;
    collapse(): void;
    resetCuboidPerspective(): void;
}

function objectItemsAreEqual(prevProps: Props, nextProps: Props): boolean {
    return nextProps.activated === prevProps.activated
        && nextProps.locked === prevProps.locked
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
        && attrValuesAreEqual(nextProps.attrValues, prevProps.attrValues);
}

function ObjectItemComponent(props: Props): JSX.Element {
    const {
        activated,
        objectType,
        shapeType,
        clientID,
        serverID,
        locked,
        attrValues,
        labelID,
        color,
        colors,

        attributes,
        labels,
        collapsed,
        normalizedKeyMap,

        activate,
        copy,
        propagate,
        createURL,
        switchOrientation,
        toBackground,
        toForeground,
        remove,
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
                <ObjectButtonsContainer
                    clientID={clientID}
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
