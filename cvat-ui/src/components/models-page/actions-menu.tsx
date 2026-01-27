// Copyright (C) 2020-2025 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Dropdown from 'antd/lib/dropdown';
import { MLModel } from 'cvat-core-wrapper';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { MenuProps } from 'antd/lib/menu';
import { shallowEqual, useSelector } from 'react-redux';

interface ModelActionsProps {
    model: MLModel;
    triggerElement: (menuItems: NonNullable<MenuProps['items']>) => JSX.Element | null;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
}

function ModelActionsComponent(props: Readonly<ModelActionsProps>): JSX.Element | null {
    const {
        model,
        triggerElement,
        dropdownTrigger,
    } = props;
    const {
        interactors,
        detectors,
        trackers,
        reid,
        selectedIds,
    } = useSelector((state: CombinedState) => ({
        interactors: state.models.interactors,
        detectors: state.models.detectors,
        trackers: state.models.trackers,
        reid: state.models.reid,
        selectedIds: state.models.selected,
    }), shallowEqual);

    const allModels = [
        ...interactors,
        ...detectors,
        ...trackers,
        ...reid,
    ];

    const menuPlugins = usePlugins(
        (state: CombinedState) => state.plugins.components.modelsPage.modelItem.menu.items,
        { model },
        { allModels, selectedIds },
    );
    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];
    menuItems.push(...menuPlugins
        .map(({ component, weight }): typeof menuItems[0] => [component({
            targetProps: props, targetState: { allModels, selectedIds },
        }), weight]),
    );

    // Sort menu items by weight before passing to Dropdown
    const sortedMenuItems = [...menuItems].sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]);
    const finalMenuItems = sortedMenuItems.map((menuItem) => menuItem[0]);

    const renderedTrigger = triggerElement(finalMenuItems);
    if (!renderedTrigger) {
        return null;
    }

    return (
        <Dropdown
            trigger={dropdownTrigger || ['click']}
            destroyPopupOnHide
            menu={{
                items: finalMenuItems,
                triggerSubMenuAction: 'click',
            }}
        >
            {renderedTrigger}
        </Dropdown>
    );
}

export default React.memo(ModelActionsComponent);
