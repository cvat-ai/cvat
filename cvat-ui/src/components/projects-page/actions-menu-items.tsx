// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { MenuProps } from 'antd/lib/menu';
import { usePlugins } from 'utils/hooks';
import { CVATMenuEditLabel } from 'components/common/cvat-menu-edit-label';
import { LabelWithCountHOF } from 'components/common/label-with-count';

interface MenuItemsData {
    projectId: number;
    startEditField: (key: string) => void;
    pluginActions: ReturnType<typeof usePlugins>;
    onExportDataset: () => void;
    onImportDataset: () => void;
    onBackupProject: () => void;
    onDeleteProject: () => void;
    selectedIds: number[];
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
        selectedIds = [],
    } = menuItemsData;

    const isBulkMode = selectedIds.length > 1;
    const bulkAllowedKeys = ['edit_assignee', 'backup-project', 'export-dataset', 'delete'];
    const isDisabled = (key: string): boolean => isBulkMode && !bulkAllowedKeys.includes(key);
    const withCount = LabelWithCountHOF(selectedIds, bulkAllowedKeys);

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'export-dataset',
        onClick: onExportDataset,
        label: withCount('导出数据集', 'export-dataset'),
        disabled: isDisabled('export-dataset'),
    }, 0]);

    menuItems.push([{
        key: 'import-dataset',
        onClick: onImportDataset,
        label: '导入数据集',
        disabled: isDisabled('import-dataset'),
    }, 10]);

    menuItems.push([{
        key: 'backup-project',
        onClick: onBackupProject,
        label: withCount('备份项目', 'backup-project'),
        disabled: isDisabled('backup-project'),
    }, 20]);

    menuItems.push([{
        key: 'edit_assignee',
        onClick: () => startEditField('assignee'),
        label: <CVATMenuEditLabel>{withCount('负责人', 'edit_assignee')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_assignee'),
    }, 30]);

    menuItems.push([{
        key: 'view-analytics',
        label: <Link to={`/projects/${projectId}/analytics`}>查看分析</Link>,
        disabled: isDisabled('view-analytics'),
    }, 40]);

    menuItems.push([{
        key: 'quality-control',
        label: <Link to={`/projects/${projectId}/quality-control`}>质量控制</Link>,
        disabled: isDisabled('quality-control'),
    }, 50]);

    menuItems.push([{
        key: 'set-webhooks',
        label: <Link to={`/projects/${projectId}/webhooks`}>设置 Webhook</Link>,
        disabled: isDisabled('set-webhooks'),
    }, 60]);

    menuItems.push([{
        type: 'divider',
    }, 69]);

    menuItems.push([{
        key: 'edit_organization',
        onClick: () => startEditField('organization'),
        label: <CVATMenuEditLabel>组织</CVATMenuEditLabel>,
    }, 70]);

    menuItems.push([{
        key: 'delete',
        onClick: onDeleteProject,
        label: withCount('删除', 'delete'),
        disabled: isDisabled('delete'),
    }, 80]);

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: projectMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    return menuItems.toSorted((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]).map((menuItem) => menuItem[0]);
}

