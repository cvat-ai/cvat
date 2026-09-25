// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { useDroppable } from '@dnd-kit/core';

import { layerDropID } from './index';
import LayerHeader from './layer-header';

interface LayerSectionProps {
    zOrder: number;
    selected: boolean;
    visible: boolean;
    collapsed: boolean;
    selectLayer(zOrder: number): void;
    toggleLayerVisibility(zOrder: number, includeLower: boolean): void;
    toggleLayerCollapsed(zOrder: number): void;
}

// The layer header remains a drop target when its object rows are virtualized separately.
function LayerSection(props: LayerSectionProps): JSX.Element {
    const {
        zOrder, selected, visible, collapsed, selectLayer,
        toggleLayerCollapsed, toggleLayerVisibility,
    } = props;

    const { isOver, setNodeRef } = useDroppable({ id: layerDropID(zOrder) });

    return (
        <div
            ref={setNodeRef}
            className={[
                'cvat-objects-sidebar-z-layer',
                'cvat-objects-sidebar-z-layer-virtual-header',
                ...(!collapsed ? ['cvat-objects-sidebar-z-layer-virtual-header-expanded'] : []),
                ...(isOver ? ['cvat-objects-sidebar-z-layer-active'] : []),
            ].join(' ')}
            data-z-order={zOrder}
        >
            <LayerHeader
                zOrder={zOrder}
                selected={selected}
                visible={visible}
                collapsed={collapsed}
                selectLayer={selectLayer}
                toggleLayerVisibility={toggleLayerVisibility}
                toggleLayerCollapsed={toggleLayerCollapsed}
            />
        </div>
    );
}

export default React.memo(LayerSection);
