// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useMemo, useState,
} from 'react';

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

import { StatesOrdering, Workspace, isMultiSelectionSupported } from 'reducers';
import { ObjectState } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import CVATTooltip from 'components/common/cvat-tooltip';
import VirtualList, { VirtualListScrollTarget } from 'components/common/virtual-list';
import {
    OBJECTS_SIDEBAR_EXPAND_Z_LAYER_EVENT,
} from 'utils/objects-sidebar';
import {
    isMultiSelectObjectModifierPressed, sanitizeSelectedObjectIDs,
} from 'utils/multi-selection';

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

interface PendingScrollTarget {
    itemID: string;
    rootID: string;
    rootClientID: number;
    parentID: number | null;
}

enum SidebarRowKind {
    OBJECT = 'object',
    LAYER = 'layer',
    INSERT = 'insert',
}

type SidebarRow =
    | { kind: SidebarRowKind.OBJECT; key: string; clientID: number; zOrder: number | null; lastInLayer: boolean }
    | { kind: SidebarRowKind.LAYER; key: string; zOrder: number; placement: LayerPlacement }
    | { kind: SidebarRowKind.INSERT; key: string; placement: LayerPlacement };

const sidebarRowKey = (row: SidebarRow): string => row.key;
const sidebarRowType = (row: SidebarRow): string => (
    row.kind === SidebarRowKind.OBJECT && row.zOrder !== null ? 'layer-object' : row.kind
);

interface Props {
    workspace: Workspace;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsedAll: boolean;
    statesOrdering: StatesOrdering;
    currentLayer: number;
    hiddenLayers: Set<number>;
    selectedStatesID: number[];
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
    selectObjects(clientIDs: number[]): void;
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
        selectedStatesID,
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
        selectObjects,
    } = props;
    const multiSelectionSupported = isMultiSelectionSupported(workspace);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
            distance: 6,
        },
    }));
    // Keep collapse state in the list so expand/open events and collapse-all can coordinate all sections.
    const [collapsedLayers, setCollapsedLayers] = useState<Set<number>>(() => new Set());
    const [expandedSkeletons, setExpandedSkeletons] = useState<Set<number>>(() => new Set());
    const toggleSkeletonParts = useCallback((clientID: number, expanded: boolean): void => {
        setExpandedSkeletons((current) => {
            const next = new Set(current);
            if (expanded) next.add(clientID);
            else next.delete(clientID);
            return next;
        });
    }, []);
    useEffect(() => {
        // A deleted object may be replaced by a new object with the same client ID after clearing annotations.
        const existing = new Set(objectStates.map((state) => state.clientID));
        setExpandedSkeletons((current) => {
            const retained = new Set([...current].filter((clientID) => existing.has(clientID)));
            return retained.size === current.size ? current : retained;
        });
    }, [objectStates]);
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [activeDragID, setActiveDragID] = useState<string | null>(null);
    const [dragPointerPosition, setDragPointerPosition] = useState<PointerPosition | null>(null);
    const [pendingScrollTarget, setPendingScrollTarget] = useState<PendingScrollTarget | null>(null);
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
                kind: SidebarRowKind.OBJECT, key: `flat-object:${clientID}`, clientID, zOrder: null, lastInLayer: false,
            }));
        }

        const rows: SidebarRow[] = [];
        zLayers.forEach((zOrder: number, index: number): void => {
            const placement: LayerPlacement = index === 0 ? { before: zOrder } : { after: zLayers[index - 1] };
            rows.push({
                kind: SidebarRowKind.LAYER, key: `layer:${zOrder}`, zOrder, placement,
            });

            if (!collapsedLayers.has(zOrder)) {
                const objectIds = objectIdsByLayer[zOrder] || [];
                objectIds.forEach((clientID: number, objectIndex: number): void => {
                    rows.push({
                        kind: SidebarRowKind.OBJECT,
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
            rows.push({ kind: SidebarRowKind.INSERT, key: layerInsertDropID(placement), placement });
        }
        return rows;
    }, [collapsedLayers, objectIdsByLayer, sortedStatesID, statesOrdering, zLayers]);

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

    const scrollTarget = useMemo((): VirtualListScrollTarget | null => (pendingScrollTarget ? {
        key: `${statesOrdering === StatesOrdering.LAYER ? 'layer' : 'flat'}-object:${pendingScrollTarget.rootClientID}`,
        getElement: (row) => row.querySelector<HTMLElement>(`#${pendingScrollTarget.itemID}`) ||
            row.querySelector<HTMLElement>(`#${pendingScrollTarget.rootID}`),
    } : null), [pendingScrollTarget, statesOrdering]);
    const finishScroll = useCallback((): void => {
        setPendingScrollTarget((current) => (current === pendingScrollTarget ? null : current));
    }, [pendingScrollTarget]);

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

            if (Number.isInteger(parentID)) toggleSkeletonParts(rootClientID, true);

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
    }, [layerStatesById, sortedStatesID, statesOrdering, toggleSkeletonParts]);

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

    const selectableObjectIDs = useMemo(() => new Set(sanitizeSelectedObjectIDs(
        layerObjectStates,
        sortedStatesID,
        hiddenLayers,
    )), [layerObjectStates, sortedStatesID, hiddenLayers]);
    const selectableObjectIdsByLayer = useMemo(() => Object.fromEntries(Object.entries(objectIdsByLayer).map(
        ([zOrder, clientIDs]): [string, number[]] => [
            zOrder,
            clientIDs.filter((clientID: number): boolean => selectableObjectIDs.has(clientID)),
        ],
    )), [objectIdsByLayer, selectableObjectIDs]);
    const selectedObjectIDs = useMemo(() => new Set(selectedStatesID), [selectedStatesID]);

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
        let moved = false;

        if (clientID !== null && zOrder !== null) {
            // Dropping an object onto an existing layer moves it into that layer.
            moveObjectsToLayer({ clientID }, zOrder);
            moved = true;
        } else if (clientID !== null && placement !== null) {
            // Dropping an object between layers creates a new layer before/after a layout boundary.
            moveObjectsOnNewLayer({ clientID }, placement);
            moved = true;
        } else if (sourceZOrder !== null && zOrder !== null) {
            // Dropping a layer onto an existing layer merges both layers.
            moveObjectsToLayer({ zOrder: sourceZOrder }, zOrder);
            moved = true;
        } else if (sourceZOrder !== null && placement !== null) {
            if (isLayerDroppedBesideItself(sourceZOrder, placement)) {
                return;
            }

            // Dropping a layer between layers creates a new layer before/after a layout boundary.
            moveObjectsOnNewLayer({ zOrder: sourceZOrder }, placement);
            moved = true;
        }

        if (moved) {
            selectObjects([]);
        }
    }, [moveObjectsOnNewLayer, moveObjectsToLayer, selectObjects]);

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
        selectObjects([]);
    };
    const compactLayerStack = (): void => {
        compactLayers();
        selectObjects([]);
    };
    const toggleObjectSelection = (clientID: number): void => {
        selectObjects(selectedStatesID.includes(clientID) ?
            selectedStatesID.filter((selectedID: number): boolean => selectedID !== clientID) :
            [...selectedStatesID, clientID]);
    };
    const selectObjectRangeWithinLayer = (clientID: number, zOrder: number): void => {
        const layerObjectIDs = selectableObjectIdsByLayer[zOrder] || [];
        const anchorID = [...selectedStatesID].reverse().find(
            (selectedID: number): boolean => layerObjectIDs.includes(selectedID),
        );
        if (typeof anchorID !== 'number') {
            selectObjects([...selectedStatesID, clientID]);
            return;
        }

        const from = layerObjectIDs.indexOf(anchorID);
        const to = layerObjectIDs.indexOf(clientID);
        const range = layerObjectIDs.slice(Math.min(from, to), Math.max(from, to) + 1);
        selectObjects([...new Set([...selectedStatesID, ...range])]);
    };
    const selectLayerObjects = (event: React.MouseEvent | React.KeyboardEvent, zOrder: number): void => {
        if (!multiSelectionSupported || ('button' in event && event.button !== 0) ||
            ('key' in event && !['Enter', ' '].includes(event.key)) ||
            (event.target as Element).closest('button, [role="button"]')) {
            return;
        }

        if (!isMultiSelectObjectModifierPressed(event)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const affectedIDs = selectableObjectIdsByLayer[zOrder] || [];
        const selectedIDs = new Set(selectedStatesID);
        const remove = affectedIDs.length > 0 &&
            affectedIDs.every((clientID: number): boolean => selectedIDs.has(clientID));
        selectObjects(remove ?
            selectedStatesID.filter((clientID: number): boolean => !affectedIDs.includes(clientID)) :
            [...new Set([...selectedStatesID, ...affectedIDs])]);
    };
    const visibleObjectIDs = useMemo(() => (statesOrdering === StatesOrdering.LAYER ? zLayers
        .filter((zOrder: number): boolean => !collapsedLayers.has(zOrder))
        .flatMap((zOrder: number): number[] => objectIdsByLayer[zOrder] || []) : sortedStatesID),
    [statesOrdering, zLayers, collapsedLayers, objectIdsByLayer, sortedStatesID]);

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
                        visibleObjectIDs={visibleObjectIDs}
                        visibleSkeletonElements={visibleSkeletonElements}
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
    const keepMountedKeys = useMemo((): string[] => {
        if (!activeDragID) return [];
        const clientID = parseObjectDragID(activeDragID);
        if (clientID !== null) return [`layer-object:${clientID}`];
        const zOrder = parseLayerDragID(activeDragID);
        return zOrder !== null ? [`layer:${zOrder}`] : [];
    }, [activeDragID]);
    const virtualList = (
        <VirtualList<SidebarRow>
            className={`cvat-objects-sidebar-virtual-list${
                layerOrdering ? ' cvat-objects-sidebar-z-layers-virtual-list' : ''
            }`}
            data={sidebarRows}
            itemKey={sidebarRowKey}
            itemType={sidebarRowType}
            keepMountedKeys={keepMountedKeys}
            scrollTarget={scrollTarget}
            onScrollTargetComplete={finishScroll}
        >
            {(row: SidebarRow): JSX.Element => {
                if (row.kind === SidebarRowKind.LAYER) {
                    return (
                        <div className='cvat-objects-sidebar-layer-virtual-row'>
                            <LayerInsertDropArea
                                placement={row.placement}
                                pointerPosition={dragPointerPosition}
                            />
                            <LayerSection
                                zOrder={row.zOrder}
                                selected={row.zOrder === currentLayer}
                                multiSelected={multiSelectionSupported &&
                                    !!selectableObjectIdsByLayer[row.zOrder]?.length &&
                                    selectableObjectIdsByLayer[row.zOrder].every(
                                        (clientID: number): boolean => selectedObjectIDs.has(clientID),
                                    )}
                                visible={!hiddenLayers.has(row.zOrder)}
                                collapsed={collapsedLayers.has(row.zOrder)}
                                selectLayer={selectLayer}
                                toggleLayerVisibility={toggleLayerVisibility}
                                toggleLayerCollapsed={toggleLayerCollapsed}
                                onMouseDown={(event: React.MouseEvent): void => (
                                    selectLayerObjects(event, row.zOrder)
                                )}
                                onKeyDown={(event: React.KeyboardEvent): void => (
                                    selectLayerObjects(event, row.zOrder)
                                )}
                            />
                        </div>
                    );
                }

                if (row.kind === SidebarRowKind.INSERT) {
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
                                visibleObjectIDs={objectIdsByLayer[row.zOrder] || []}
                                visibleSkeletonElements={visibleSkeletonElements}
                                partsExpanded={expandedSkeletons.has(row.clientID)}
                                onPartsExpandedChange={toggleSkeletonParts}
                                draggable={!!object && !object.lock}
                                toggleSelection={(): void => toggleObjectSelection(row.clientID)}
                                selectRange={(): void => (
                                    selectObjectRangeWithinLayer(row.clientID, row.zOrder as number)
                                )}
                                multiSelectionSupported={multiSelectionSupported}
                            />
                        </div>
                    );
                }

                return (
                    <div className='cvat-objects-sidebar-virtual-row'>
                        <ObjectItemContainer
                            objectStates={objectStates}
                            clientID={row.clientID}
                            visibleObjectIDs={visibleObjectIDs}
                            visibleSkeletonElements={visibleSkeletonElements}
                            partsExpanded={expandedSkeletons.has(row.clientID)}
                            onPartsExpandedChange={toggleSkeletonParts}
                        />
                    </div>
                );
            }}
        </VirtualList>
    );

    return (
        <div className='cvat-objects-sidebar-object-list'>
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
                                    onClick={compactLayerStack}
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
        </div>
    );
}

export default React.memo(ObjectListComponent);
