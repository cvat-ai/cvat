// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { MenuProps } from 'antd/lib/menu';
import { usePlugins } from 'utils/hooks';

interface MenuItemsData {
    pluginActions: ReturnType<typeof usePlugins>;
    onExportDataset: () => void;
    onImportDataset: () => void;
    onBackupProject: () => void;
    onSetupWebhooks: () => void;
    onDeleteProject: () => void;
    onOpenQualityControl: () => void;
}

export default function ProjectActionsItems(
    menuItemsData: MenuItemsData,
    projectMenuProps: unknown,
): MenuProps['items'] {
    const {
        pluginActions,
        onExportDataset,
        onImportDataset,
        onBackupProject,
        onSetupWebhooks,
        onDeleteProject,
        onOpenQualityControl,
    } = menuItemsData;

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'export-dataset',
        onClick: onExportDataset,
        label: 'Export dataset',
    }, 0]);

    menuItems.push([{
        key: 'import-dataset',
        onClick: onImportDataset,
        label: 'Import dataset',
    }, 10]);

    menuItems.push([{
        key: 'backup-project',
        onClick: onBackupProject,
        label: 'Backup Project',
    }, 20]);

    menuItems.push([{
        key: 'quality-control',
        onClick: onOpenQualityControl,
        label: 'Quality control',
    }, 30]);

    menuItems.push([{
        key: 'set-webhooks',
        onClick: onSetupWebhooks,
        label: 'Setup webhooks',
    }, 40]);

    menuItems.push([{
        type: 'divider',
    }, 49]);

    menuItems.push([{
        key: 'delete',
        onClick: onDeleteProject,
        label: 'Delete',
    }, 50]);

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: projectMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    return menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]).map((menuItem) => menuItem[0]);
}
