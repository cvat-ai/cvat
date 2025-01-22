// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import Text from 'antd/lib/typography/Text';
import Collapse from 'antd/lib/collapse';

import ObjectButtonsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-buttons';
import ItemDetailsContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item-details';
import { ObjectType, ShapeType, ColorBy } from 'reducers';
import ObjectItemElementComponent from './object-item-element';
import ItemBasics from './object-item-basics';

interface Props {
    normalizedKeyMap: Record<string, string>;
    readonly: boolean;
    activated: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | null;
    labelID: number;
    isGroundTruth: boolean;
    locked: boolean;
    elements: number[];
    color: string;
    colorBy: ColorBy;
    labels: any[];
    attributes: any[];
    jobInstance: any;
    activate(activeElementID?: number): void;
    copy(): void;
    propagate(): void;
    switchOrientation(): void;
    createURL(): void;
    toBackground(): void;
    toForeground(): void;
    remove(): void;
    changeLabel(label: any): void;
    changeColor(color: string): void;
    resetCuboidPerspective(): void;
    runAnnotationAction(): void;
    edit(): void;
    slice(): void;
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
        isGroundTruth,
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
        runAnnotationAction,
        edit,
        slice,
        jobInstance,
    } = props;

    const type =
        objectType === ObjectType.TAG ?
            ObjectType.TAG.toUpperCase() :
            `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = !activated ?
        'cvat-objects-sidebar-state-item' :
        'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item';

    const activateState = useCallback(() => {
        activate();
    }, []);

    return (
        <div style={{ display: 'flex', marginBottom: '1px' }}>
            <div
                onMouseEnter={activateState}
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
                    isGroundTruth={isGroundTruth}
                    copyShortcut={normalizedKeyMap.COPY_SHAPE}
                    pasteShortcut={normalizedKeyMap.PASTE_SHAPE}
                    propagateShortcut={normalizedKeyMap.PROPAGATE_OBJECT}
                    toBackgroundShortcut={normalizedKeyMap.TO_BACKGROUND}
                    toForegroundShortcut={normalizedKeyMap.TO_FOREGROUND}
                    removeShortcut={normalizedKeyMap.DELETE_OBJECT_STANDARD_WORKSPACE}
                    changeColorShortcut={normalizedKeyMap.CHANGE_OBJECT_COLOR}
                    sliceShortcut={normalizedKeyMap.SWITCH_SLICE_MODE}
                    runAnnotationsActionShortcut={normalizedKeyMap.RUN_ANNOTATIONS_ACTION}
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
                    edit={edit}
                    slice={slice}
                    runAnnotationAction={runAnnotationAction}
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
                    <Collapse
                        className='cvat-objects-sidebar-state-item-elements-collapse'
                        items={[{
                            key: 'elements',
                            label: <Text style={{ fontSize: 10 }} type='secondary'>PARTS</Text>,
                            children: elements.map((element: number) => (
                                <ObjectItemElementComponent
                                    key={element}
                                    readonly={readonly}
                                    parentID={clientID}
                                    clientID={element}
                                    onMouseLeave={activateState}
                                />
                            )),
                        }]}
                    />
                )}
            </div>
        </div>
    );
}

export default React.memo(ObjectItemComponent);
