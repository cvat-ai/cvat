// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';

import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
    pointerWithin, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    CaretDownOutlined, CaretRightOutlined, EyeInvisibleOutlined,
    EyeOutlined, VerticalAlignMiddleOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import { StatesOrdering, Workspace } from 'reducers';
import { ObjectState } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import CVATTooltip from 'components/common/cvat-tooltip';
import {
    OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT,
} from 'utils/objects-sidebar';

import ObjectListHeader from './objects-list-header';
import {
    type LayerPlacement,
    type PointerPosition,
    type LayerMoveSource,
    isLayerState,
    isLayerDroppedBesideItself,
    parseLayerDragID,
    parseLayerDropID,
    parseLayerInsertDropID,
    parseObjectDragID,
} from './drag-and-drop';
import LayerInsertDropArea from './drag-and-drop/layer-insert-drop-area';
import LayerSection from './drag-and-drop/layer-section';

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    currentLayer: number;
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

function ObjectListComponent(props: Props): JSX.Element {
    const {
        workspace,
        statesHidden,
        statesLocked,
        statesCollapsedAll,
        statesOrdering,
        currentLayer,
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
    // Keep collapse state in the list so expand/open events and collapse-all can coordinate all sections.
    const [collapsedLayers, setCollapsedLayers] = useState<Set<number>>(() => new Set());
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [activeDragID, setActiveDragID] = useState<string | null>(null);
    const [dragPointerPosition, setDragPointerPosition] = useState<PointerPosition | null>(null);
    const [pendingExpandedLayerItemID, setPendingExpandedLayerItemID] = useState<string | null>(null);
    const layerObjectStates = objectStates.filter(isLayerState);
    const zLayers = Array.from(
        new Set(layerObjectStates.map((state) => state.zOrder)),
    ).sort((left: number, right: number): number => left - right);

    const allLayersCollapsed = !!zLayers.length && zLayers.every((zOrder: number): boolean => (
        collapsedLayers.has(zOrder)
    ));

    // Remove collapse markers for layers that disappeared after filtering or z-order changes.
    useEffect((): void => {
        const availableLayers = new Set(zLayers);

        setCollapsedLayers((current: Set<number>): Set<number> => {
            const next = new Set<number>();

            current.forEach((zOrder: number): void => {
                if (availableLayers.has(zOrder)) {
                    next.add(zOrder);
                }
            });

            return next;
        });
    }, [zLayers.join(',')]);

    useEffect((): void => {
        if (!pendingExpandedLayerItemID) {
            return;
        }

        const sidebarItem = window.document.getElementById(pendingExpandedLayerItemID);

        if (sidebarItem) {
            sidebarItem.scrollIntoView({ block: 'nearest' });
            setPendingExpandedLayerItemID(null);
        }
    }, [collapsedLayers, pendingExpandedLayerItemID]);

    // React to external requests to expand the layer containing a target object.
    useEffect((): () => void => {
        const onExpandLayer = (event: Event): void => {
            const { clientID, parentID } = (
                event as CustomEvent<{ clientID: number; parentID: number | null }>
            ).detail;

            const expandedState = objectStates.find((state: ObjectState): boolean => (
                state.clientID === (parentID ?? clientID)
            ));

            if (expandedState) {
                if (collapsedLayers.has(expandedState.zOrder)) {
                    const itemID = Number.isInteger(parentID) ?
                        `cvat-objects-sidebar-state-item-element-${clientID}` :
                        `cvat-objects-sidebar-state-item-${clientID}`;

                    setPendingExpandedLayerItemID(itemID);
                }

                setCollapsedLayers((current: Set<number>): Set<number> => {
                    const next = new Set(current);
                    next.delete(expandedState.zOrder);
                    return next;
                });
            }
        };

        window.addEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandLayer);

        return (): void => {
            window.removeEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandLayer);
        };
    }, [collapsedLayers, objectStates]);

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
            const object = layerObjectStates.find((state: ObjectState): boolean => state.clientID === id);

            if (object) {
                acc[object.zOrder] = acc[object.zOrder] || [];
                acc[object.zOrder].push(id);
            }

            return acc;
        }, {});

    const onDragEnd = useCallback((event: DragEndEvent): void => {
        const { active, over } = event;

        setDragActive(false);
        setActiveDragID(null);
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

    const onDragStart = useCallback((event: DragStartEvent): void => {
        setDragActive(true);
        setActiveDragID(String(event.active.id));
    }, []);

    const onDragCancel = useCallback((): void => {
        setDragActive(false);
        setActiveDragID(null);
        setDragPointerPosition(null);
    }, []);

    const toggleLayerCollapsed = (zOrder: number): void => {
        setCollapsedLayers((current: Set<number>): Set<number> => {
            const next = new Set(current);

            if (next.has(zOrder)) {
                next.delete(zOrder);
            } else {
                next.add(zOrder);
            }

            return next;
        });
    };

    const toggleAllLayersCollapsed = (): void => {
        setCollapsedLayers(allLayersCollapsed ? new Set() : new Set(zLayers));
    };

    const renderDragOverlay = (): JSX.Element | null => {
        if (!activeDragID) {
            return null;
        }

        const clientID = parseObjectDragID(activeDragID);

        if (clientID !== null) {
            return (
                <div className='cvat-objects-sidebar-z-layer-drag-overlay'>
                    <ObjectItemContainer
                        objectStates={objectStates}
                        clientID={clientID}
                        visibleSkeletonElements={visibleSkeletonElements}
                        allowSimplifyLifecycle
                        zLayerDragging
                    />
                </div>
            );
        }

        const zOrder = parseLayerDragID(activeDragID);

        if (zOrder === null) {
            return null;
        }

        const visible = zOrder <= currentLayer;

        return (
            <div className='cvat-objects-sidebar-z-layer-mark cvat-objects-sidebar-z-layer-mark-dragging'>
                <Text strong>Layer {zOrder}</Text>
                <span className='cvat-objects-sidebar-z-layer-visibility-indicator'>
                    {visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </span>
            </div>
        );
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
                {statesOrdering === StatesOrdering.LAYER ? (
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
                                {zLayers.map((zOrder: number, index: number): JSX.Element => {
                                    const placement: LayerPlacement = index === 0 ?
                                        { before: zOrder } :
                                        { after: zLayers[index - 1] };

                                    return (
                                        <React.Fragment key={zOrder}>
                                            <LayerInsertDropArea
                                                placement={placement}
                                                pointerPosition={dragPointerPosition}
                                            />
                                            <LayerSection
                                                zOrder={zOrder}
                                                layerObjectIds={objectIdsByLayer[zOrder] || []}
                                                objectStates={layerObjectStates}
                                                visibleSkeletonElements={visibleSkeletonElements}
                                                selected={zOrder === currentLayer}
                                                visible={zOrder <= currentLayer}
                                                collapsed={collapsedLayers.has(zOrder)}
                                                selectLayer={selectLayer}
                                                toggleLayerCollapsed={toggleLayerCollapsed}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                                {!!zLayers.length && (
                                    <LayerInsertDropArea
                                        placement={{ after: zLayers[zLayers.length - 1] }}
                                        pointerPosition={dragPointerPosition}
                                    />
                                )}
                            </div>
                            <DragOverlay
                                // dnd-kit's default drop animation scrolls the source node back into view.
                                // Disable it so wheel scrolling the sidebar during drag is preserved after drop.
                                dropAnimation={null}
                                // Let wheel/pointer events reach the sidebar under the drag preview.
                                style={{ pointerEvents: 'none' }}
                            >
                                {renderDragOverlay()}
                            </DragOverlay>
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
