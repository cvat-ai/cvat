/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import Collapse from 'antd/lib/collapse';

import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ItemDetailsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { ObjectType, ShapeType, ColorBy } from 'reducers';
import { ObjectState } from 'cvat-core-wrapper';
import { attrValuesAreEqual } from './object-item-details';
import ObjectItemElementComponent from './object-item-element';
import ItemBasics from './object-item-basics';

interface Props {
    normalizedKeyMap: Record<string, string>;
    readonly: boolean;
    activated: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    locked: boolean;
    elements: any[];
    color: string;
    colorBy: ColorBy;
    labels: any[];
    attributes: any[];
    jobInstance: any;
    activate(activeElementID: number, multiSelect: boolean): void;
    copy(): void;
    propagate(): void;
    createURL(): void;
    switchOrientation(): void;
    toBackground(): void;
    toForeground(): void;
    remove(): void;
    changeLabel(label: any): void;
    changeColor(color: string): void;
    resetCuboidPerspective(): void;
}

function objectItemsAreEqual(prevProps: Props, nextProps: Props): boolean {
    return (
        nextProps.activated === prevProps.activated &&
        nextProps.readonly === prevProps.readonly &&
        nextProps.locked === prevProps.locked &&
        nextProps.labelID === prevProps.labelID &&
        nextProps.color === prevProps.color &&
        nextProps.clientID === prevProps.clientID &&
        nextProps.serverID === prevProps.serverID &&
        nextProps.objectType === prevProps.objectType &&
        nextProps.shapeType === prevProps.shapeType &&
        nextProps.attributes === prevProps.attributes &&
        nextProps.normalizedKeyMap === prevProps.normalizedKeyMap &&
        nextProps.colorBy === prevProps.colorBy &&
        attrValuesAreEqual(nextProps.attributes, prevProps.attributes)
    );
}

function ObjectItemComponent(props: Props): JSX.Element {
    const {
        activated,
        readonly,
        objectType,
        shapeType,
        clientID,
        serverID,
        locked,
        labelID,
        color,
        colorBy,
        elements,
        attributes,
        labels,
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
        changeColor,
        resetCuboidPerspective,
        jobInstance,
    } = props;

    const type =
        objectType === ObjectType.TAG ?
            ObjectType.TAG.toUpperCase() :
            `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = !activated ?
        'cvat-objects-sidebar-state-item' :
        'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item';

    // console.log(`rendering item ${clientID}`);

    return (
        <div style={{ display: 'flex', marginBottom: '1px' }}>
            <div
                onClick={(e) => activate(null, e.shiftKey)}
                id={`cvat-objects-sidebar-state-item-${clientID}`}
                className={className}
                style={{ backgroundColor: `${color}88` }}
            >
                <ItemBasics
                    jobInstance={jobInstance}
                    readonly={readonly}
                    serverID={serverID}
                    clientID={clientID}
                    labelID={labelID}
                    labels={labels}
                    shapeType={shapeType}
                    objectType={objectType}
                    color={color}
                    colorBy={colorBy}
                    type={type}
                    locked={locked}
                    copyShortcut={normalizedKeyMap.COPY_SHAPE}
                    pasteShortcut={normalizedKeyMap.PASTE_SHAPE}
                    propagateShortcut={normalizedKeyMap.PROPAGATE_OBJECT}
                    toBackgroundShortcut={normalizedKeyMap.TO_BACKGROUND}
                    toForegroundShortcut={normalizedKeyMap.TO_FOREGROUND}
                    removeShortcut={normalizedKeyMap.DELETE_OBJECT}
                    changeColorShortcut={normalizedKeyMap.CHANGE_OBJECT_COLOR}
                    changeLabel={changeLabel}
                    changeColor={changeColor}
                    copy={copy}
                    remove={remove}
                    propagate={propagate}
                    createURL={createURL}
                    switchOrientation={switchOrientation}
                    toBackground={toBackground}
                    toForeground={toForeground}
                    resetCuboidPerspective={resetCuboidPerspective}
                />
                <ObjectButtonsContainer readonly={readonly} clientID={clientID} />
                {!!attributes.length && (
                    <ItemDetailsContainer
                        readonly={readonly}
                        clientID={clientID}
                        parentID={null}
                    />
                )}
                {!!elements.length && (
                    <>
                        <Collapse
                            className='cvat-objects-sidebar-state-item-elements-collapse'
                            activeKey='objects'
                        >
                            <Collapse.Panel
                                key='objects'
                                header={(
                                    <>
                                        <Text style={{ fontSize: 10 }} type='secondary'>PARTS</Text>
                                        <br />
                                    </>
                                )}
                            >
                                {elements.map((element: ObjectState) => (
                                    <ObjectItemElementComponent
                                        key={element.clientID as number}
                                        readonly={readonly}
                                        parentID={clientID}
                                        clientID={element.clientID as number}
                                    />
                                ))}
                            </Collapse.Panel>
                        </Collapse>
                    </>
                )}
            </div>
        </div>
    );
}

export default React.memo(ObjectItemComponent, objectItemsAreEqual);
