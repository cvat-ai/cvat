// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { MenuProps } from 'antd/lib/menu';
import { usePlugins } from 'utils/hooks';

interface MenuItemsData {
    projectID: number;
    pluginActions: ReturnType<typeof usePlugins>;
    onExportDataset: () => void;
    onImportDataset: () => void;
    onBackupProject: () => void;
    onDeleteProject: () => void;
}

export default function ProjectActionsItems(
    menuItemsData: MenuItemsData,
    projectMenuProps: unknown,
): MenuProps['items'] {
    const {
        projectID,
        pluginActions,
        onExportDataset,
        onImportDataset,
        onBackupProject,
        onDeleteProject,
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
        key: 'view-analytics',
        label: <Link to={`/projects/${projectID}/analytics`}>View analytics</Link>,
    }, 30]);

    menuItems.push([{
        key: 'quality-control',
        label: <Link to={`/projects/${projectID}/quality-control`}>Quality control</Link>,
    }, 40]);

    menuItems.push([{
        key: 'set-webhooks',
        label: <Link to={`/projects/${projectID}/webhooks`}>Setup webhooks</Link>,
    }, 50]);

    menuItems.push([{
        type: 'divider',
    }, 59]);

    menuItems.push([{
        key: 'delete',
        onClick: onDeleteProject,
        label: 'Delete',
    }, 60]);

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: projectMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    return menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]).map((menuItem) => menuItem[0]);
}
