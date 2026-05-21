// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useState,
} from 'react';

import {
    DndContext, DragEndEvent, PointerSensor, pointerWithin,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    CaretDownOutlined, CaretRightOutlined, VerticalAlignMiddleOutlined,
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
import {
    isLayerDroppedBesideItself,
    type LayerPlacement,
    parseLayerDragID,
    parseLayerDropID,
    parseLayerInsertDropID,
    parseObjectDragID,
    type PointerPosition,
    ZLayerInsertDropArea,
    ZLayerSection,
} from './z-layer-drag-and-drop';
import ObjectListHeader from './objects-list-header';

export type { LayerPlacement } from './z-layer-drag-and-drop';
export type LayerMoveSource = { clientID: number } | { zOrder: number };

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
    const layerObjectStates = objectStates.filter((state: ObjectState): boolean => state.objectType !== ObjectType.TAG);
    const zLayers = Array.from(new Set([...getZLayers(layerObjectStates), currentZLayer]))
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
                                {zLayers.map((zOrder: number, index: number): JSX.Element => {
                                    const placement: LayerPlacement = index === 0 ?
                                        { before: zOrder } :
                                        { after: zLayers[index - 1] };

                                    return (
                                        <React.Fragment key={zOrder}>
                                            <ZLayerInsertDropArea
                                                placement={placement}
                                                pointerPosition={dragPointerPosition}
                                            />
                                            <ZLayerSection
                                                zOrder={zOrder}
                                                layerObjectIds={objectIdsByLayer[zOrder] || []}
                                                objectStates={layerObjectStates}
                                                visibleSkeletonElements={visibleSkeletonElements}
                                                selected={zOrder === currentZLayer}
                                                visible={zOrder <= currentZLayer}
                                                collapsed={collapsedZLayers.includes(zOrder)}
                                                selectLayer={selectLayer}
                                                toggleLayerCollapsed={toggleLayerCollapsed}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                                {!!zLayers.length && (
                                    <ZLayerInsertDropArea
                                        placement={{ after: zLayers[zLayers.length - 1] }}
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
