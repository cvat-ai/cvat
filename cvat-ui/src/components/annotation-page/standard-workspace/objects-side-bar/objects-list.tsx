// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';

import {
    DndContext, DragEndEvent, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    CaretDownOutlined, CaretRightOutlined, HolderOutlined, VerticalAlignMiddleOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import { StatesOrdering, Workspace } from 'reducers';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { ObjectState, ObjectType } from 'cvat-core-wrapper';
import CVATTooltip from 'components/common/cvat-tooltip';
import ObjectListHeader from './objects-list-header';

const OBJECT_DRAG_ID_PREFIX = 'object:';
const LAYER_DRAG_ID_PREFIX = 'drag-layer:';
const LAYER_DROP_ID_PREFIX = 'layer:';
const LAYER_INSERT_DROP_ID_PREFIX = 'insert-layer:';

type LayerDragMode = 'move' | 'merge';

function objectDragID(clientID: number): string {
    return `${OBJECT_DRAG_ID_PREFIX}${clientID}`;
}

function layerDragID(zOrder: number): string {
    return `${LAYER_DRAG_ID_PREFIX}${zOrder}`;
}

function layerDropID(zOrder: number): string {
    return `${LAYER_DROP_ID_PREFIX}${zOrder}`;
}

function layerInsertDropID(zOrder: number): string {
    // Gap drop targets mean "insert a new layer at this z-order".
    return `${LAYER_INSERT_DROP_ID_PREFIX}${zOrder}`;
}

function parseObjectDragID(id: string): number | null {
    if (!id.startsWith(OBJECT_DRAG_ID_PREFIX)) {
        return null;
    }

    const clientID = Number(id.slice(OBJECT_DRAG_ID_PREFIX.length));
    return Number.isInteger(clientID) ? clientID : null;
}

function parseLayerDragID(id: string): number | null {
    if (!id.startsWith(LAYER_DRAG_ID_PREFIX)) {
        return null;
    }

    const zOrder = Number(id.slice(LAYER_DRAG_ID_PREFIX.length));
    return Number.isInteger(zOrder) ? zOrder : null;
}

function parseLayerDropID(id: string): number | null {
    if (!id.startsWith(LAYER_DROP_ID_PREFIX)) {
        return null;
    }

    const zOrder = Number(id.slice(LAYER_DROP_ID_PREFIX.length));
    return Number.isInteger(zOrder) ? zOrder : null;
}

function parseLayerInsertDropID(id: string): number | null {
    if (!id.startsWith(LAYER_INSERT_DROP_ID_PREFIX)) {
        return null;
    }

    const zOrder = Number(id.slice(LAYER_INSERT_DROP_ID_PREFIX.length));
    return Number.isInteger(zOrder) ? zOrder : null;
}

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    sortedStatesID: number[];
    objectStates: ObjectState[];
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    showGroundTruth: boolean;
    changeStatesOrdering(value: StatesOrdering): void;
    moveObjectToLayer(clientID: number, targetZOrder: number): void;
    moveObjectToNewLayer(clientID: number, targetZOrder: number): void;
    moveLayer(sourceZOrder: number, targetZOrder: number, mode: LayerDragMode): void;
    compactLayers(): void;
    lockAllStates(): void;
    unlockAllStates(): void;
    collapseAllStates(): void;
    expandAllStates(): void;
    hideAllStates(): void;
    showAllStates(): void;
    changeShowGroundTruth(): void;
}

interface DraggableObjectItemProps {
    objectStates: ObjectState[];
    clientID: number;
    draggable: boolean;
}

function DraggableObjectItem(props: DraggableObjectItemProps): JSX.Element {
    const { objectStates, clientID, draggable } = props;
    const {
        attributes, listeners, setNodeRef, transform, isDragging,
    } = useDraggable({
        id: objectDragID(clientID),
        disabled: !draggable,
    });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            {...(draggable ? attributes : {})}
            {...(draggable ? listeners : {})}
            className={isDragging ? 'cvat-objects-sidebar-z-layer-dragging' : undefined}
            style={style}
        >
            <ObjectItemContainer
                objectStates={objectStates}
                clientID={clientID}
                allowSimplifyLifecycle
                zLayerDragging={isDragging}
                zLayerDragProps={draggable ? {} : undefined}
            />
        </div>
    );
}

interface ZLayerHeaderProps {
    zOrder: number;
    collapsed: boolean;
    toggleLayerCollapsed(zOrder: number): void;
}

function ZLayerHeader(props: ZLayerHeaderProps): JSX.Element {
    const {
        zOrder, collapsed, toggleLayerCollapsed,
    } = props;
    const {
        attributes, listeners, setNodeRef, transform, isDragging,
    } = useDraggable({ id: layerDragID(zOrder) });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;
    const className = `cvat-objects-sidebar-z-layer-mark${
        isDragging ? ' cvat-objects-sidebar-z-layer-mark-dragging' : ''
    }`;

    return (
        <div
            ref={setNodeRef}
            className={className}
            style={style}
        >
            <div className='cvat-objects-sidebar-z-layer-controls'>
                <CVATTooltip title={collapsed ? 'Expand layer' : 'Collapse layer'}>
                    <Button
                        className='cvat-objects-sidebar-z-layer-collapse-button'
                        type='text'
                        size='small'
                        icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                        onClick={(): void => toggleLayerCollapsed(zOrder)}
                    />
                </CVATTooltip>
                <CVATTooltip title='Drag layer'>
                    <Button
                        {...attributes}
                        {...listeners}
                        className='cvat-objects-sidebar-z-layer-drag-handle'
                        type='text'
                        size='small'
                        icon={<HolderOutlined />}
                    />
                </CVATTooltip>
            </div>
            <Text strong>{zOrder}</Text>
        </div>
    );
}

interface ZLayerSectionProps {
    zOrder: number;
    objectIDs: number[];
    objectStates: ObjectState[];
    collapsed: boolean;
    toggleLayerCollapsed(zOrder: number): void;
}

function ZLayerSection(props: ZLayerSectionProps): JSX.Element {
    const {
        zOrder, objectIDs, objectStates, collapsed, toggleLayerCollapsed,
    } = props;
    const { isOver, setNodeRef } = useDroppable({ id: layerDropID(zOrder) });

    return (
        <div
            ref={setNodeRef}
            className={`cvat-objects-sidebar-z-layer${isOver ? ' cvat-objects-sidebar-z-layer-active' : ''}`}
        >
            <ZLayerHeader
                zOrder={zOrder}
                collapsed={collapsed}
                toggleLayerCollapsed={toggleLayerCollapsed}
            />
            {!collapsed && objectIDs.map((id: number): JSX.Element => {
                const object = objectStates.find((state: ObjectState): boolean => state.clientID === id);

                return (
                    <DraggableObjectItem
                        key={id}
                        objectStates={objectStates}
                        clientID={id}
                        draggable={object?.objectType !== ObjectType.TAG}
                    />
                );
            })}
        </div>
    );
}

interface ZLayerInsertDropAreaProps {
    zOrder: number;
}

function ZLayerInsertDropArea(props: ZLayerInsertDropAreaProps): JSX.Element {
    const { zOrder } = props;
    const { isOver, setNodeRef } = useDroppable({ id: layerInsertDropID(zOrder) });

    return (
        <div
            ref={setNodeRef}
            className={`cvat-objects-sidebar-z-layer-move-drop-area${
                isOver ? ' cvat-objects-sidebar-z-layer-move-drop-area-active' : ''
            }`}
        />
    );
}

function getZLayers(objectStates: ObjectState[]): number[] {
    return Array.from(new Set(objectStates.map((state: ObjectState): number => state.zOrder)))
        .sort((left: number, right: number): number => left - right);
}

function ObjectListComponent(props: Props): JSX.Element {
    const {
        workspace,
        statesHidden,
        statesLocked,
        statesCollapsedAll,
        statesOrdering,
        sortedStatesID,
        objectStates,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        showGroundTruth,
        changeStatesOrdering,
        moveObjectToLayer,
        moveObjectToNewLayer,
        moveLayer,
        compactLayers,
        lockAllStates,
        unlockAllStates,
        collapseAllStates,
        expandAllStates,
        hideAllStates,
        showAllStates,
        changeShowGroundTruth,
    } = props;
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 6,
        },
    }));
    const [collapsedZLayers, setCollapsedZLayers] = useState<number[]>([]);
    const zLayers = getZLayers(objectStates);
    const allLayersCollapsed = !!zLayers.length && zLayers.every((zOrder: number): boolean => (
        collapsedZLayers.includes(zOrder)
    ));
    useEffect((): void => {
        setCollapsedZLayers((current: number[]): number[] => (
            current.filter((zOrder: number): boolean => zLayers.includes(zOrder))
        ));
    }, [zLayers.join(',')]);
    const zLayerIDs = zLayers.reduce((acc: Record<number, number[]>, zOrder: number): Record<number, number[]> => {
        acc[zOrder] = [];
        return acc;
    }, {});
    sortedStatesID.forEach((id: number): void => {
        const object = objectStates.find((state: ObjectState): boolean => state.clientID === id);

        if (object) {
            zLayerIDs[object.zOrder] = zLayerIDs[object.zOrder] || [];
            zLayerIDs[object.zOrder].push(id);
        }
    });
    const onDragEnd = (event: DragEndEvent): void => {
        const { active, over } = event;

        if (!over) {
            return;
        }

        const clientID = parseObjectDragID(String(active.id));
        const sourceZOrder = parseLayerDragID(String(active.id));
        const zOrder = parseLayerDropID(String(over.id));
        const insertZOrder = parseLayerInsertDropID(String(over.id));

        if (clientID !== null && zOrder !== null) {
            // Dropping an object onto an existing layer moves it into that layer.
            moveObjectToLayer(clientID, zOrder);
        } else if (clientID !== null && insertZOrder !== null) {
            // Dropping an object between layers creates a new layer and shifts following layers.
            moveObjectToNewLayer(clientID, insertZOrder);
        } else if (sourceZOrder !== null && zOrder !== null) {
            // Dropping a layer onto an existing layer merges both layers.
            moveLayer(sourceZOrder, zOrder, 'merge');
        } else if (sourceZOrder !== null && insertZOrder !== null) {
            // Dropping a layer between layers moves it there and shifts intervening layers.
            moveLayer(sourceZOrder, insertZOrder, 'move');
        }
    };
    const toggleLayerCollapsed = (zOrder: number): void => {
        setCollapsedZLayers((current: number[]): number[] => (
            current.includes(zOrder) ?
                current.filter((currentZOrder: number): boolean => currentZOrder !== zOrder) :
                [...current, zOrder]
        ));
    };
    const toggleAllLayersCollapsed = (): void => {
        setCollapsedZLayers(allLayersCollapsed ? [] : [...zLayers]);
    };

    return (
        <>
            <ObjectListHeader
                workspace={workspace}
                statesHidden={statesHidden}
                statesLocked={statesLocked}
                statesCollapsed={statesCollapsedAll}
                statesOrdering={statesOrdering}
                switchLockAllShortcut={switchLockAllShortcut}
                switchHiddenAllShortcut={switchHiddenAllShortcut}
                showGroundTruth={showGroundTruth}
                count={objectStates.length}
                changeStatesOrdering={changeStatesOrdering}
                lockAllStates={lockAllStates}
                unlockAllStates={unlockAllStates}
                collapseAllStates={collapseAllStates}
                expandAllStates={expandAllStates}
                hideAllStates={hideAllStates}
                showAllStates={showAllStates}
                changeShowGroundTruth={changeShowGroundTruth}
            />
            <div className='cvat-objects-sidebar-states-list'>
                {statesOrdering === StatesOrdering.Z_ORDER ? (
                    <div className='cvat-objects-sidebar-z-layers-panel'>
                        <div className='cvat-objects-sidebar-z-layers-title'>
                            <Text strong>Layer stack</Text>
                            <CVATTooltip title='Compact layers'>
                                <Button
                                    className='cvat-objects-sidebar-z-layers-compact-button'
                                    type='text'
                                    size='small'
                                    icon={<VerticalAlignMiddleOutlined />}
                                    onClick={compactLayers}
                                />
                            </CVATTooltip>
                            <CVATTooltip title={allLayersCollapsed ? 'Expand all layers' : 'Collapse all layers'}>
                                <Button
                                    className='cvat-objects-sidebar-z-layers-collapse-all-button'
                                    type='text'
                                    size='small'
                                    icon={allLayersCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                                    onClick={toggleAllLayersCollapsed}
                                />
                            </CVATTooltip>
                        </div>
                        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
                            {zLayers.map((zOrder: number): JSX.Element => (
                                <React.Fragment key={zOrder}>
                                    <ZLayerInsertDropArea zOrder={zOrder} />
                                    <ZLayerSection
                                        zOrder={zOrder}
                                        objectIDs={zLayerIDs[zOrder] || []}
                                        objectStates={objectStates}
                                        collapsed={collapsedZLayers.includes(zOrder)}
                                        toggleLayerCollapsed={toggleLayerCollapsed}
                                    />
                                </React.Fragment>
                            ))}
                            {!!zLayers.length && (
                                <ZLayerInsertDropArea zOrder={zLayers[zLayers.length - 1] + 1} />
                            )}
                        </DndContext>
                    </div>
                ) : sortedStatesID.map((id: number): JSX.Element => (
                    <ObjectItemContainer
                        key={id}
                        objectStates={objectStates}
                        clientID={id}
                        allowSimplifyLifecycle
                    />
                ))}
            </div>
        </>
    );
}

export default React.memo(ObjectListComponent);
