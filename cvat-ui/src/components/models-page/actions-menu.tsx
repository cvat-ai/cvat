// Copyright (C) 2020-2025 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Dropdown from 'antd/lib/dropdown';
import { MLModel, ModelProviders } from 'cvat-core-wrapper';
import { usePlugins } from 'utils/hooks';
import { CombinedState } from 'reducers';
import { MenuProps } from 'antd/lib/menu';
import { useSelector } from 'react-redux';

interface ModelActionsProps {
    model: MLModel;
    triggerElement: JSX.Element;
    dropdownTrigger?: ('click' | 'hover' | 'contextMenu')[];
    renderTriggerIfEmpty?: boolean;
}

function ModelActionsComponent(props: Readonly<ModelActionsProps>): JSX.Element | null {
    const {
        model,
        triggerElement,
        dropdownTrigger,
        renderTriggerIfEmpty = true,
    } = props;
    const allModels = useSelector((state: CombinedState) => [
        ...state.models.interactors,
        ...state.models.detectors,
        ...state.models.trackers,
        ...state.models.reid,
    ]);
    const selectedIds = useSelector((state: CombinedState) => state.models.selected);

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

    if (!renderTriggerIfEmpty && (menuItems.length === 0 || model.provider === ModelProviders.CVAT)) {
        return null;
    }

    return (
        <Dropdown
            trigger={dropdownTrigger || ['click']}
            destroyPopupOnHide
            menu={{
                items: sortedMenuItems.map((menuItem) => menuItem[0]),
                triggerSubMenuAction: 'click',
            }}
        >
            {triggerElement}
        </Dropdown>
    );
}

export default React.memo(ModelActionsComponent);
