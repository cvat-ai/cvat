// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
    pointerWithin, useSensor, useSensors,
} from '@dnd-kit/core';
import VirtualList, { ListRef } from 'rc-virtual-list';
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
    layerInsertDropID,
    parseLayerDragID,
    parseLayerDropID,
    parseLayerInsertDropID,
    parseLayerObjectDropID,
    parseObjectDragID,
} from './drag-and-drop';
import DraggableObjectItem from './drag-and-drop/draggable-object-item';
import LayerInsertDropArea from './drag-and-drop/layer-insert-drop-area';
import LayerSection from './drag-and-drop/layer-section';

const OBJECT_ITEM_ESTIMATED_HEIGHT = 88;
const LAYER_ITEM_ESTIMATED_HEIGHT = 100;
const SCROLL_TARGET_MAX_FRAMES = 60;

interface PendingScrollTarget {
    itemID: string;
    rootID: string;
    rootClientID: number;
    parentID: number | null;
}

type SidebarRow =
    | { kind: 'object'; key: string; clientID: number; zOrder: number | null; lastInLayer: boolean }
    | { kind: 'layer'; key: string; zOrder: number; placement: LayerPlacement }
    | { kind: 'insert'; key: string; placement: LayerPlacement };

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    currentLayer: number;
    hiddenLayers: Set<number>;
    sortedStatesID: number[];
    objectStates: ObjectState[];
    visibleSkeletonElements: Record<number, number[]>;
    switchLockAllShortcut: string;
    switchHiddenAllShortcut: string;
    showGroundTruth: boolean;
    changeStatesOrdering(value: StatesOrdering): void;
    selectLayer(zOrder: number): void;
    toggleLayersVisibility(zOrders: number[]): void;
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
        hiddenLayers,
        sortedStatesID,
        objectStates,
        visibleSkeletonElements,
        switchLockAllShortcut,
        switchHiddenAllShortcut,
        showGroundTruth,
        changeStatesOrdering,
        selectLayer,
        toggleLayersVisibility,
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
    const [pendingScrollTarget, setPendingScrollTarget] = useState<PendingScrollTarget | null>(null);
    const [statesListHeight, setStatesListHeight] = useState(0);
    const statesListRef = useRef<HTMLDivElement>(null);
    const layerStackRef = useRef<HTMLDivElement>(null);
    const virtualListRef = useRef<ListRef>(null);
    const layerObjectStates = useMemo(() => objectStates.filter(isLayerState), [objectStates]);
    const layerStatesById = useMemo(() => new Map(
        layerObjectStates.map((state: ObjectState): [number, ObjectState] => [state.clientID, state]),
    ), [layerObjectStates]);
    const zLayers = useMemo(() => Array.from(
        new Set(layerObjectStates.map((state) => state.zOrder)),
    ).sort((left: number, right: number): number => left - right), [layerObjectStates]);
    const objectIdsByLayer = useMemo(() => {
        if (statesOrdering !== StatesOrdering.LAYER) {
            return {} as Record<number, number[]>;
        }

        return sortedStatesID.reduce((acc: Record<number, number[]>, id: number): Record<number, number[]> => {
            const object = layerStatesById.get(id);
            if (object) {
                acc[object.zOrder] = acc[object.zOrder] || [];
                acc[object.zOrder].push(id);
            }
            return acc;
        }, {});
    }, [layerStatesById, sortedStatesID, statesOrdering]);
    const sidebarRows = useMemo((): SidebarRow[] => {
        if (statesOrdering !== StatesOrdering.LAYER) {
            return sortedStatesID.map((clientID: number): SidebarRow => ({
                kind: 'object', key: `flat-object:${clientID}`, clientID, zOrder: null, lastInLayer: false,
            }));
        }

        const rows: SidebarRow[] = [];
        zLayers.forEach((zOrder: number, index: number): void => {
            const placement: LayerPlacement = index === 0 ? { before: zOrder } : { after: zLayers[index - 1] };
            rows.push({
                kind: 'layer', key: `layer:${zOrder}`, zOrder, placement,
            });

            if (!collapsedLayers.has(zOrder)) {
                const objectIds = objectIdsByLayer[zOrder] || [];
                objectIds.forEach((clientID: number, objectIndex: number): void => {
                    rows.push({
                        kind: 'object',
                        key: `layer-object:${clientID}`,
                        clientID,
                        zOrder,
                        lastInLayer: objectIndex === objectIds.length - 1,
                    });
                });
            }
        });
        if (zLayers.length) {
            const placement: LayerPlacement = { after: zLayers[zLayers.length - 1] };
            rows.push({ kind: 'insert', key: layerInsertDropID(placement), placement });
        }
        return rows;
    }, [collapsedLayers, objectIdsByLayer, sortedStatesID, statesOrdering, zLayers]);

    const allLayersCollapsed = !!zLayers.length && zLayers.every((zOrder: number): boolean => (
        collapsedLayers.has(zOrder)
    ));

    useEffect((): () => void => {
        const statesList = statesListRef.current;
        if (!statesList) {
            return () => {};
        }

        const layerStack = layerStackRef.current;
        const updateHeight = (): void => {
            setStatesListHeight(layerStack?.clientHeight ?? statesList.clientHeight);
        };
        const resizeObserver = new ResizeObserver(updateHeight);

        updateHeight();
        resizeObserver.observe(statesList);
        if (layerStack) {
            resizeObserver.observe(layerStack);
        }

        return (): void => resizeObserver.disconnect();
    }, [statesOrdering]);

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
        if (pendingScrollTarget) {
            const index = sidebarRows.findIndex((row: SidebarRow): boolean => (
                row.kind === 'object' && row.clientID === pendingScrollTarget.rootClientID
            ));
            if (index !== -1) {
                virtualListRef.current?.scrollTo({ index, align: 'top' });
            }
        }
    }, [pendingScrollTarget, sidebarRows]);

    useEffect((): (() => void) | undefined => {
        if (!pendingScrollTarget) {
            return undefined;
        }

        let frame: number;
        let attempts = 0;
        let stableFrames = 0;
        const alignTarget = (): void => {
            const item = window.document.getElementById(pendingScrollTarget.itemID) || (
                pendingScrollTarget.parentID !== null ?
                    window.document.getElementById(pendingScrollTarget.rootID) : null
            );
            const scrollContainer = statesListRef.current?.querySelector<HTMLElement>('.rc-virtual-list-holder');

            if (item && scrollContainer) {
                const scrollPaddingTop = Number.parseFloat(
                    window.getComputedStyle(scrollContainer).scrollPaddingTop,
                ) || 0;
                const delta = item.getBoundingClientRect().top -
                    scrollContainer.getBoundingClientRect().top - scrollPaddingTop;
                if (Math.abs(delta) > 1) {
                    scrollContainer.scrollTop += delta;
                    stableFrames = 0;
                } else {
                    stableFrames++;
                }

                if (stableFrames >= 2) {
                    setPendingScrollTarget(null);
                    return;
                }
            }

            if (++attempts < SCROLL_TARGET_MAX_FRAMES) {
                frame = window.requestAnimationFrame(alignTarget);
            } else {
                setPendingScrollTarget(null);
            }
        };

        frame = window.requestAnimationFrame(alignTarget);
        return (): void => window.cancelAnimationFrame(frame);
    }, [pendingScrollTarget, sidebarRows]);

    // React to external requests to expand the layer containing a target object.
    useEffect((): () => void => {
        const onExpandLayer = (event: Event): void => {
            const { clientID, parentID } = (
                event as CustomEvent<{ clientID: number; parentID: number | null }>
            ).detail;
            const rootClientID = parentID ?? clientID;

            if (statesOrdering === StatesOrdering.LAYER) {
                const expandedState = layerStatesById.get(rootClientID);
                if (!expandedState) {
                    return;
                }
                setCollapsedLayers((current: Set<number>): Set<number> => {
                    const next = new Set(current);
                    next.delete(expandedState.zOrder);
                    return next;
                });
            } else if (!sortedStatesID.includes(rootClientID)) {
                return;
            }

            setPendingScrollTarget({
                itemID: Number.isInteger(parentID) ?
                    `cvat-objects-sidebar-state-item-element-${clientID}` :
                    `cvat-objects-sidebar-state-item-${clientID}`,
                rootID: `cvat-objects-sidebar-state-item-${rootClientID}`,
                rootClientID,
                parentID,
            });
        };

        window.addEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandLayer);

        return (): void => {
            window.removeEventListener(OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT, onExpandLayer);
        };
    }, [layerStatesById, sortedStatesID, statesOrdering]);

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
        const zOrder = parseLayerDropID(String(over.id)) ?? parseLayerObjectDropID(String(over.id));
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

    const toggleLayerVisibility = (zOrder: number, includeLower: boolean): void => {
        toggleLayersVisibility(includeLower ? [zOrder, ...zLayers.filter((layer) => layer < zOrder)] : [zOrder]);
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

        const visible = !hiddenLayers.has(zOrder);

        return (
            <div className='cvat-objects-sidebar-z-layer-mark cvat-objects-sidebar-z-layer-mark-dragging'>
                <Text strong>Layer {zOrder}</Text>
                <span className='cvat-objects-sidebar-z-layer-visibility-indicator'>
                    {visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </span>
            </div>
        );
    };

    const layerOrdering = statesOrdering === StatesOrdering.LAYER;
    const virtualList = statesListHeight > 0 ? (
        <VirtualList<SidebarRow>
            ref={virtualListRef}
            className={`cvat-objects-sidebar-virtual-list${
                layerOrdering ? ' cvat-objects-sidebar-z-layers-virtual-list' : ''
            }`}
            data={sidebarRows}
            height={statesListHeight}
            itemHeight={layerOrdering ? LAYER_ITEM_ESTIMATED_HEIGHT : OBJECT_ITEM_ESTIMATED_HEIGHT}
            itemKey={(row: SidebarRow): string => row.key}
        >
            {(row: SidebarRow): JSX.Element => {
                if (row.kind === 'layer') {
                    return (
                        <div className='cvat-objects-sidebar-layer-virtual-row'>
                            <LayerInsertDropArea
                                placement={row.placement}
                                pointerPosition={dragPointerPosition}
                            />
                            <LayerSection
                                zOrder={row.zOrder}
                                selected={row.zOrder === currentLayer}
                                visible={!hiddenLayers.has(row.zOrder)}
                                collapsed={collapsedLayers.has(row.zOrder)}
                                selectLayer={selectLayer}
                                toggleLayerVisibility={toggleLayerVisibility}
                                toggleLayerCollapsed={toggleLayerCollapsed}
                            />
                        </div>
                    );
                }

                if (row.kind === 'insert') {
                    return (
                        <div className='cvat-objects-sidebar-layer-virtual-row'>
                            <LayerInsertDropArea
                                placement={row.placement}
                                pointerPosition={dragPointerPosition}
                            />
                        </div>
                    );
                }

                if (row.zOrder !== null) {
                    const object = layerStatesById.get(row.clientID);
                    return (
                        <div className='cvat-objects-sidebar-layer-virtual-row'>
                            <DraggableObjectItem
                                objectStates={layerObjectStates}
                                clientID={row.clientID}
                                zOrder={row.zOrder}
                                lastInLayer={row.lastInLayer}
                                visibleSkeletonElements={visibleSkeletonElements}
                                draggable={!!object && !object.lock}
                            />
                        </div>
                    );
                }

                return (
                    <div className='cvat-objects-sidebar-virtual-row'>
                        <ObjectItemContainer
                            objectStates={objectStates}
                            clientID={row.clientID}
                            visibleSkeletonElements={visibleSkeletonElements}
                            allowSimplifyLifecycle
                        />
                    </div>
                );
            }}
        </VirtualList>
    ) : null;

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
            <div
                ref={statesListRef}
                className={`cvat-objects-sidebar-states-list ${
                    layerOrdering ? 'cvat-objects-sidebar-states-list-layer-virtualized' :
                        'cvat-objects-sidebar-states-list-virtualized'
                }`}
            >
                {layerOrdering ? (
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
                            <div ref={layerStackRef} className='cvat-objects-sidebar-z-layers-stack'>
                                {virtualList}
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
                ) : virtualList}
            </div>
        </>
    );
}

export default React.memo(ObjectListComponent);
