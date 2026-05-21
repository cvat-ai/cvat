// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';

import {
    DndContext, DragEndEvent, PointerSensor, pointerWithin,
    useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    CaretDownOutlined, CaretRightOutlined, EyeInvisibleOutlined,
    EyeOutlined, HolderOutlined,
    SelectOutlined, VerticalAlignMiddleOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import { StatesOrdering, Workspace } from 'reducers';
import { ObjectState, ObjectType } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT,
    OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT,
} from 'utils/objects-sidebar';
import ObjectListHeader from './objects-list-header';

const OBJECT_DRAG_ID_PREFIX = 'object:';
const LAYER_DRAG_ID_PREFIX = 'drag-layer:';
const LAYER_DROP_ID_PREFIX = 'layer:';
const LAYER_INSERT_DROP_ID_PREFIX = 'insert-layer:';

export type LayerPlacement = { before: number } | { after: number };
export type LayerMoveSource = { clientID: number } | { zOrder: number };
type PointerPosition = { x: number; y: number };

function objectDragID(clientID: number): string {
    return `${OBJECT_DRAG_ID_PREFIX}${clientID}`;
}

function layerDragID(zOrder: number): string {
    return `${LAYER_DRAG_ID_PREFIX}${zOrder}`;
}

function layerDropID(zOrder: number): string {
    return `${LAYER_DROP_ID_PREFIX}${zOrder}`;
}

function layerInsertDropID(placement: LayerPlacement): string {
    if ('before' in placement) {
        return `${LAYER_INSERT_DROP_ID_PREFIX}before:${placement.before}`;
    }

    return `${LAYER_INSERT_DROP_ID_PREFIX}after:${placement.after}`;
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

function parseLayerInsertDropID(id: string): LayerPlacement | null {
    if (!id.startsWith(LAYER_INSERT_DROP_ID_PREFIX)) {
        return null;
    }

    const [kind, value] = id.slice(LAYER_INSERT_DROP_ID_PREFIX.length).split(':');
    const zOrder = Number(value);

    if (!Number.isInteger(zOrder)) {
        return null;
    }

    if (kind === 'before') {
        return { before: zOrder };
    }

    if (kind === 'after') {
        return { after: zOrder };
    }

    return null;
}

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    currentZLayer: number;
    sortedStatesID: number[];
    objectStates: ObjectState[];
    visibleSkeletonElements: Record<number, number[]>;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    showGroundTruth: boolean;
    changeStatesOrdering(value: StatesOrdering): void;
    selectLayer(zOrder: number): void;
    moveObjectsToLayer(source: LayerMoveSource, targetZOrder: number): void;
    moveObjectsOnNewLayer(source: LayerMoveSource, placement: LayerPlacement): void;
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
    visibleSkeletonElements: Record<number, number[]>;
}

function DraggableObjectItem(props: DraggableObjectItemProps): JSX.Element {
    const {
        objectStates, clientID, draggable, visibleSkeletonElements,
    } = props;

    const {
        attributes, listeners, setNodeRef, transform, isDragging,
    } = useDraggable({
        id: objectDragID(clientID),
        disabled: !draggable,
    });

    // dnd-kit exposes the live drag offset; applying it makes the dragged card follow the pointer.
    const style = {
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
        ...(isDragging ? { pointerEvents: 'none' as const } : {}),
    };

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
                visibleSkeletonElements={visibleSkeletonElements}
                allowSimplifyLifecycle
                zLayerDragging={isDragging}
                zLayerDragProps={draggable ? {} : undefined}
            />
        </div>
    );
}

interface ZLayerHeaderProps {
    zOrder: number;
    selected: boolean;
    visible: boolean;
    collapsed: boolean;
    selectLayer(zOrder: number): void;
    toggleLayerCollapsed(zOrder: number): void;
}

function ZLayerHeader(props: ZLayerHeaderProps): JSX.Element {
    const {
        zOrder, selected, visible, collapsed, selectLayer, toggleLayerCollapsed,
    } = props;

    const {
        attributes, listeners, setNodeRef, transform, isDragging,
    } = useDraggable({ id: layerDragID(zOrder) });

    // dnd-kit exposes the live drag offset; applying it makes the dragged layer follow the pointer.
    const style = {
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
        ...(isDragging ? { pointerEvents: 'none' as const } : {}),
    };

    const className = [
        'cvat-objects-sidebar-z-layer-mark',
        ...(isDragging ? ['cvat-objects-sidebar-z-layer-mark-dragging'] : []),
        ...(!visible ? ['cvat-objects-sidebar-z-layer-mark-invisible'] : []),
        ...(selected ? ['cvat-objects-sidebar-z-layer-mark-selected'] : []),
    ].join(' ');

    const visibilityTooltip = visible ? 'Visible on canvas' : 'Hidden on canvas';
    const selectLayerTooltip = selected ? 'Current layer. Higher layers are hidden on canvas' :
        'Select as current layer. Higher layers will not be visible on canvas';

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
                <CVATTooltip title={selectLayerTooltip}>
                    <Button
                        className='cvat-objects-sidebar-z-layer-select-button'
                        type='text'
                        size='small'
                        disabled={selected}
                        icon={<SelectOutlined />}
                        onClick={(): void => selectLayer(zOrder)}
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
            <div className='cvat-objects-sidebar-z-layer-id'>
                <Text strong>{zOrder}</Text>
                <CVATTooltip title={visibilityTooltip}>
                    <span className='cvat-objects-sidebar-z-layer-visibility-indicator'>
                        {visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    </span>
                </CVATTooltip>
            </div>
        </div>
    );
}

interface ZLayerSectionProps {
    zOrder: number;
    layerObjectIds: number[];
    objectStates: ObjectState[];
    visibleSkeletonElements: Record<number, number[]>;
    selected: boolean;
    visible: boolean;
    collapsed: boolean;
    selectLayer(zOrder: number): void;
    toggleLayerCollapsed(zOrder: number): void;
}

function ZLayerSection(props: ZLayerSectionProps): JSX.Element {
    const {
        zOrder, layerObjectIds, objectStates, visibleSkeletonElements,
        selected, visible, collapsed, selectLayer,
        toggleLayerCollapsed,
    } = props;

    const { isOver, setNodeRef } = useDroppable({ id: layerDropID(zOrder) });
    return (
        <div
            ref={setNodeRef}
            className={`cvat-objects-sidebar-z-layer${isOver ? ' cvat-objects-sidebar-z-layer-active' : ''}`}
            data-z-order={zOrder}
        >
            <ZLayerHeader
                zOrder={zOrder}
                selected={selected}
                visible={visible}
                collapsed={collapsed}
                selectLayer={selectLayer}
                toggleLayerCollapsed={toggleLayerCollapsed}
            />
            {!collapsed && layerObjectIds.map((id: number): JSX.Element => {
                const object = objectStates.find((state: ObjectState): boolean => state.clientID === id);

                return (
                    <DraggableObjectItem
                        key={id}
                        objectStates={objectStates}
                        clientID={id}
                        visibleSkeletonElements={visibleSkeletonElements}
                        draggable={object.objectType === ObjectType.SHAPE || object.objectType === ObjectType.TRACK}
                    />
                );
            })}
        </div>
    );
}

interface ZLayerInsertDropAreaProps {
    placement: LayerPlacement;
    pointerPosition: PointerPosition | null;
}

function ZLayerInsertDropArea(props: ZLayerInsertDropAreaProps): JSX.Element {
    const { placement, pointerPosition } = props;
    const { isOver, setNodeRef } = useDroppable({ id: layerInsertDropID(placement) });
    const dropAreaRef = useRef<HTMLDivElement | null>(null);

    const setDropAreaRef = useCallback((element: HTMLDivElement | null): void => {
        dropAreaRef.current = element;
        setNodeRef(element);
    }, [setNodeRef]);

    const INSERT_DROP_AREA_PROXIMITY = 16;
    const pointerIsNear = ((): boolean => {
        if (!pointerPosition || !dropAreaRef.current) {
            return false;
        }

        const rect = dropAreaRef.current.getBoundingClientRect();
        return (
            pointerPosition.x >= rect.left &&
            pointerPosition.x <= rect.right &&
            pointerPosition.y >= rect.top - INSERT_DROP_AREA_PROXIMITY &&
            pointerPosition.y <= rect.bottom + INSERT_DROP_AREA_PROXIMITY
        );
    })();

    const expanded = isOver || pointerIsNear;
    const classList = [
        'cvat-objects-sidebar-z-layer-move-drop-area',
        ...(expanded ? ['cvat-objects-sidebar-z-layer-move-drop-area-active'] : []),
    ];

    return (
        <div
            ref={setDropAreaRef}
            className={`${classList.join(' ')}`}
        />
    );
}

function getZLayers(objectStates: ObjectState[]): number[] {
    return Array.from(new Set(objectStates.map((state: ObjectState): number => state.zOrder)))
        .sort((left: number, right: number): number => left - right);
}

function isLayerDroppedBesideItself(sourceZOrder: number, placement: LayerPlacement): boolean {
    if ('before' in placement) {
        return sourceZOrder === placement.before;
    }

    return sourceZOrder === placement.after;
}

function ObjectListComponent(props: Props): JSX.Element {
    const {
        workspace,
        statesHidden,
        statesLocked,
        statesCollapsedAll,
        statesOrdering,
        currentZLayer,
        sortedStatesID,
        objectStates,
        visibleSkeletonElements,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        showGroundTruth,
        changeStatesOrdering,
        selectLayer,
        moveObjectsToLayer,
        moveObjectsOnNewLayer,
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
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [dragPointerPosition, setDragPointerPosition] = useState<PointerPosition | null>(null);
    const zLayers = Array.from(new Set([...getZLayers(objectStates), currentZLayer]))
        .sort((left: number, right: number): number => left - right);
    const allLayersCollapsed = !!zLayers.length && zLayers.every((zOrder: number): boolean => (
        collapsedZLayers.includes(zOrder)
    ));

    // Remove collapse markers for layers that disappeared after filtering or z-order changes.
    useEffect((): void => {
        setCollapsedZLayers((current: number[]): number[] => (
            current.filter((zOrder: number): boolean => zLayers.includes(zOrder))
        ));
    }, [zLayers.join(',')]);

    // React to external requests to expand, scroll to, or open a layer in the sidebar.
    useEffect((): () => void => {
        const onExpandZLayer = (event: Event): void => {
            const { clientID, parentID } = (
                event as CustomEvent<{ clientID: number; parentID: number | null }>
            ).detail;

            const expandedState = objectStates.find((state: ObjectState): boolean => (
                state.clientID === (parentID ?? clientID)
            ));

            if (expandedState) {
                setCollapsedZLayers((current: number[]): number[] => (
                    current.filter((zOrder: number): boolean => zOrder !== expandedState.zOrder)
                ));
            }
        };

        const onOpenZLayer = (event: Event): void => {
            const { zOrder } = (event as CustomEvent<{ zOrder: number }>).detail;

            setCollapsedZLayers((current: number[]): number[] => (
                current.filter((currentZOrder: number): boolean => currentZOrder !== zOrder)
            ));

            window.setTimeout((): void => {
                window.document
                    .querySelector(`[data-z-order="${zOrder}"]`)
                    ?.scrollIntoView({ block: 'nearest' });
            });
        };

        window.addEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandZLayer);
        window.addEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, onOpenZLayer);

        return (): void => {
            window.removeEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandZLayer);
            window.removeEventListener(OBJECTS_SIDEBAR_OPEN_Z_LAYER_EVENT, onOpenZLayer);
        };
    }, [objectStates]);

    // Track the pointer only during drag so nearby insert gaps can expand.
    useEffect((): (() => void) | undefined => {
        if (!dragActive) {
            return undefined;
        }

        const onPointerMove = (event: PointerEvent): void => {
            setDragPointerPosition({ x: event.clientX, y: event.clientY });
        };

        window.addEventListener('pointermove', onPointerMove);
        return (): void => {
            window.removeEventListener('pointermove', onPointerMove);
        };
    }, [dragActive]);

    const objectIdsByLayer = sortedStatesID
        .reduce((acc: Record<number, number[]>, id: number): Record<number, number[]> => {
            const object = objectStates.find((state: ObjectState): boolean => state.clientID === id);

            if (object) {
                acc[object.zOrder] = acc[object.zOrder] || [];
                acc[object.zOrder].push(id);
            }

            return acc;
        }, {});

    const onDragEnd = useCallback((event: DragEndEvent): void => {
        const { active, over } = event;

        setDragActive(false);
        setDragPointerPosition(null);

        if (!over) {
            return;
        }

        const clientID = parseObjectDragID(String(active.id));
        const sourceZOrder = parseLayerDragID(String(active.id));
        const zOrder = parseLayerDropID(String(over.id));
        const placement = parseLayerInsertDropID(String(over.id));

        if (clientID !== null && zOrder !== null) {
            // Dropping an object onto an existing layer moves it into that layer.
            moveObjectsToLayer({ clientID }, zOrder);
        } else if (clientID !== null && placement !== null) {
            // Dropping an object between layers creates a new layer before/after a layout boundary.
            moveObjectsOnNewLayer({ clientID }, placement);
        } else if (sourceZOrder !== null && zOrder !== null) {
            // Dropping a layer onto an existing layer merges both layers.
            moveObjectsToLayer({ zOrder: sourceZOrder }, zOrder);
        } else if (sourceZOrder !== null && placement !== null) {
            if (isLayerDroppedBesideItself(sourceZOrder, placement)) {
                return;
            }

            // Dropping a layer between layers creates a new layer before/after a layout boundary.
            moveObjectsOnNewLayer({ zOrder: sourceZOrder }, placement);
        }
    }, [moveObjectsOnNewLayer, moveObjectsToLayer]);

    const onDragStart = useCallback((): void => {
        setDragActive(true);
    }, []);

    const onDragCancel = useCallback((): void => {
        setDragActive(false);
        setDragPointerPosition(null);
    }, []);

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
                        <DndContext
                            sensors={sensors}
                            collisionDetection={pointerWithin}
                            onDragStart={onDragStart}
                            onDragCancel={onDragCancel}
                            onDragEnd={onDragEnd}
                        >
                            <div className='cvat-objects-sidebar-z-layers-stack'>
                                {zLayers.map((zOrder: number): JSX.Element => (
                                    <React.Fragment key={zOrder}>
                                        <ZLayerInsertDropArea
                                            placement={{ before: zOrder + 1 }}
                                            pointerPosition={dragPointerPosition}
                                        />
                                        <ZLayerSection
                                            zOrder={zOrder}
                                            layerObjectIds={objectIdsByLayer[zOrder] || []}
                                            objectStates={objectStates}
                                            visibleSkeletonElements={visibleSkeletonElements}
                                            selected={zOrder === currentZLayer}
                                            visible={zOrder <= currentZLayer}
                                            collapsed={collapsedZLayers.includes(zOrder)}
                                            selectLayer={selectLayer}
                                            toggleLayerCollapsed={toggleLayerCollapsed}
                                        />
                                    </React.Fragment>
                                ))}
                                {!!zLayers.length && (
                                    <ZLayerInsertDropArea
                                        placement={{ after: zLayers.length }}
                                        pointerPosition={dragPointerPosition}
                                    />
                                )}
                            </div>
                        </DndContext>
                    </div>
                ) : sortedStatesID.map((id: number): JSX.Element => (
                    <ObjectItemContainer
                        key={id}
                        objectStates={objectStates}
                        clientID={id}
                        visibleSkeletonElements={visibleSkeletonElements}
                        allowSimplifyLifecycle
                    />
                ))}
            </div>
        </>
    );
}

export default React.memo(ObjectListComponent);
