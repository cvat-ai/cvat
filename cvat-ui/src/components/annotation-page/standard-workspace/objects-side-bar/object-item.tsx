// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Text from 'antd/lib/typography/Text';
import Collapse from 'antd/lib/collapse';

import { ObjectState } from 'cvat-core-wrapper';
import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ItemDetailsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { ObjectType, ShapeType, ColorBy } from 'reducers';
import ItemBasics from './object-item-basics';

export function getColor(state: ObjectState, colorBy: ColorBy): string {
    let color = '';
    if (colorBy === ColorBy.INSTANCE) {
        color = state.color;
    } else if (colorBy === ColorBy.GROUP) {
        color = state.group?.color || '#000';
    } else if (colorBy === ColorBy.LABEL) {
        color = state.label.color as string;
    }

    return color;
}

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
    activate(): void;
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
        nextProps.labels === prevProps.labels &&
        nextProps.attributes === prevProps.attributes &&
        nextProps.elements === prevProps.elements &&
        nextProps.normalizedKeyMap === prevProps.normalizedKeyMap &&
        nextProps.colorBy === prevProps.colorBy
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

    return (
        <div style={{ display: 'flex', marginBottom: '1px' }}>
            <div className='cvat-objects-sidebar-state-item-color' style={{ background: `${color}` }} />
            <div
                onMouseEnter={activate}
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
                        <Collapse className='cvat-objects-sidebar-state-item-elements-collapse'>
                            <Collapse.Panel
                                header={(
                                    <>
                                        <Text style={{ fontSize: 10 }} type='secondary'>PARTS</Text>
                                        <br />
                                    </>
                                )}
                                key='elements'
                            >
                                {elements.map((element: any) => {
                                    const elementColor = getColor(element, colorBy);

                                    return (
                                        <div
                                            key={element.clientID}
                                            className='cvat-objects-sidebar-state-item-elements'
                                            style={{ background: `${elementColor}` }}
                                        >
                                            <Text
                                                type='secondary'
                                                style={{ fontSize: 10 }}
                                                className='cvat-objects-sidebar-state-item-object-type-text'
                                            >
                                                {`${element.label.name} [${element.shapeType.toUpperCase()}]`}
                                            </Text>
                                            <ObjectButtonsContainer readonly={readonly} clientID={element.clientID} />
                                            {!!element.label.attributes.length && (
                                                <ItemDetailsContainer
                                                    readonly={readonly}
                                                    parentID={clientID}
                                                    clientID={element.clientID}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </Collapse.Panel>
                        </Collapse>
                    </>
                )}
            </div>
        </div>
    );
}

export default React.memo(ObjectItemComponent, objectItemsAreEqual);
