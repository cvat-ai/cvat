// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { MenuProps } from 'antd/lib/menu';
import { usePlugins } from 'utils/hooks';
import { CVATMenuEditLabel } from 'components/common/cvat-menu-edit-label';

interface MenuItemsData {
    projectId: number;
    startEditField: (key: string) => void;
    pluginActions: ReturnType<typeof usePlugins>;
    onExportDataset: () => void;
    onImportDataset: () => void;
    onBackupProject: () => void;
    onDeleteProject: () => void;
    onTransferProjectBetweenWorkspaces: () => void;
}

export default function ProjectActionsItems(
    menuItemsData: MenuItemsData,
    projectMenuProps: unknown,
): MenuProps['items'] {
    const {
        projectId,
        startEditField,
        pluginActions,
        onExportDataset,
        onImportDataset,
        onBackupProject,
        onDeleteProject,
        onTransferProjectBetweenWorkspaces,
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
        key: 'edit_assignee',
        onClick: () => startEditField('assignee'),
        label: <CVATMenuEditLabel>Assignee</CVATMenuEditLabel>,
    }, 30]);

    menuItems.push([{
        key: 'view-analytics',
        label: <Link to={`/projects/${projectId}/analytics`}>View analytics</Link>,
    }, 40]);

    menuItems.push([{
        key: 'quality-control',
        label: <Link to={`/projects/${projectId}/quality-control`}>Quality control</Link>,
    }, 50]);

    menuItems.push([{
        key: 'transfer_project_between_workspaces',
        onClick: onTransferProjectBetweenWorkspaces,
        label: 'Move to organization/sandbox',
    }, 55]);

    menuItems.push([{
        key: 'set-webhooks',
        label: <Link to={`/projects/${projectId}/webhooks`}>Setup webhooks</Link>,
    }, 60]);

    menuItems.push([{
        type: 'divider',
    }, 69]);

    menuItems.push([{
        key: 'delete',
        onClick: onDeleteProject,
        label: 'Delete',
    }, 70]);

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: projectMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    return menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]).map((menuItem) => menuItem[0]);
}
