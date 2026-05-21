// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useRef } from 'react';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
    CaretDownOutlined, CaretRightOutlined, EyeInvisibleOutlined,
    EyeOutlined, HolderOutlined, SelectOutlined,
} from '@ant-design/icons';
import Button from 'antd/lib/button';
import Text from 'antd/lib/typography/Text';

import { ObjectState, ObjectType } from 'cvat-core-wrapper';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import CVATTooltip from 'components/common/cvat-tooltip';

const OBJECT_DRAG_ID_PREFIX = 'object:';
const LAYER_DRAG_ID_PREFIX = 'drag-layer:';
const LAYER_DROP_ID_PREFIX = 'layer:';
const LAYER_INSERT_DROP_ID_PREFIX = 'insert-layer:';
const INSERT_DROP_AREA_PROXIMITY = 16;

export type LayerPlacement = { before: number } | { after: number };
export type PointerPosition = { x: number; y: number };

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

export function parseObjectDragID(id: string): number | null {
    if (!id.startsWith(OBJECT_DRAG_ID_PREFIX)) {
        return null;
    }

    const clientID = Number(id.slice(OBJECT_DRAG_ID_PREFIX.length));
    return Number.isInteger(clientID) ? clientID : null;
}

export function parseLayerDragID(id: string): number | null {
    if (!id.startsWith(LAYER_DRAG_ID_PREFIX)) {
        return null;
    }

    const zOrder = Number(id.slice(LAYER_DRAG_ID_PREFIX.length));
    return Number.isInteger(zOrder) ? zOrder : null;
}

export function parseLayerDropID(id: string): number | null {
    if (!id.startsWith(LAYER_DROP_ID_PREFIX)) {
        return null;
    }

    const zOrder = Number(id.slice(LAYER_DROP_ID_PREFIX.length));
    return Number.isInteger(zOrder) ? zOrder : null;
}

export function parseLayerInsertDropID(id: string): LayerPlacement | null {
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

export function isLayerDroppedBesideItself(sourceZOrder: number, placement: LayerPlacement): boolean {
    if ('before' in placement) {
        return sourceZOrder === placement.before;
    }

    return sourceZOrder === placement.after;
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
            <div>
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

export function ZLayerSection(props: ZLayerSectionProps): JSX.Element {
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
                        draggable={object?.objectType === ObjectType.SHAPE || object?.objectType === ObjectType.TRACK}
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

export function ZLayerInsertDropArea(props: ZLayerInsertDropAreaProps): JSX.Element {
    const { placement, pointerPosition } = props;
    const { isOver, setNodeRef } = useDroppable({ id: layerInsertDropID(placement) });
    const dropAreaRef = useRef<HTMLDivElement | null>(null);

    const setDropAreaRef = useCallback((element: HTMLDivElement | null): void => {
        dropAreaRef.current = element;
        setNodeRef(element);
    }, [setNodeRef]);

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
