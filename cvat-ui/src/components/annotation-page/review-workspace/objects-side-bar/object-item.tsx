// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import ObjectButtonsContainer from 'containers/annotation-page/review-workspace/objects-side-bar/object-buttons';
import { ObjectType, ShapeType, ColorBy } from 'reducers/interfaces';
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
    attrValues: Record<number, string>;
    color: string;
    colorBy: ColorBy;

    labels: any[];
    attributes: any[];
    collapsed: boolean;

    activate(): void;
    createURL(): void;
    changeColor(color: string): void;
    collapse(): void;
}

function objectItemsAreEqual(prevProps: Props, nextProps: Props): boolean {
    return (
        nextProps.activated === prevProps.activated &&
        nextProps.labelID === prevProps.labelID &&
        nextProps.color === prevProps.color &&
        nextProps.clientID === prevProps.clientID &&
        nextProps.serverID === prevProps.serverID &&
        nextProps.objectType === prevProps.objectType &&
        nextProps.shapeType === prevProps.shapeType &&
        nextProps.collapsed === prevProps.collapsed &&
        nextProps.labels === prevProps.labels &&
        nextProps.attributes === prevProps.attributes &&
        nextProps.normalizedKeyMap === prevProps.normalizedKeyMap &&
        nextProps.colorBy === prevProps.colorBy &&
        attrValuesAreEqual(nextProps.attrValues, prevProps.attrValues)
    );
}

function ObjectItemComponent(props: Props): JSX.Element {
    const {
        activated,
        objectType,
        shapeType,
        clientID,
        serverID,
        attrValues,
        labelID,
        color,
        colorBy,

        attributes,
        labels,
        collapsed,
        normalizedKeyMap,

        activate,
        createURL,
        changeColor,
        collapse,
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
                    serverID={serverID}
                    clientID={clientID}
                    labelID={labelID}
                    labels={labels}
                    color={color}
                    colorBy={colorBy}
                    type={type}
                    changeColorShortcut={normalizedKeyMap.CHANGE_OBJECT_COLOR}
                    changeColor={changeColor}
                    createURL={createURL}
                />
                <ObjectButtonsContainer clientID={clientID} />
                {!!attributes.length && (
                    <ItemDetails
                        collapsed={collapsed}
                        attributes={attributes}
                        values={attrValues}
                        collapse={collapse}
                    />
                )}
            </div>
        </div>
    );
}

export default React.memo(ObjectItemComponent, objectItemsAreEqual);
