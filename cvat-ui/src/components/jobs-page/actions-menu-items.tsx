// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { MenuProps } from 'antd/lib/menu';
import { LoadingOutlined } from '@ant-design/icons';
import { usePlugins } from 'utils/hooks';
import { CVATMenuEditLabel } from 'components/common/cvat-menu-edit-label';
import { LabelWithCountHOF } from 'components/common/label-with-count';

interface MenuItemsData {
    jobId: number;
    taskId: number;
    projectId: number | null;
    pluginActions: ReturnType<typeof usePlugins>;
    isMergingConsensusEnabled: boolean;
    onOpenBugTracker: (() => void) | null;
    onImportAnnotations: () => void;
    onExportAnnotations: () => void;
    onMergeConsensusJob: (() => void) | null;
    onDeleteJob: (() => void) | null;
    startEditField: (key: string) => void;
    selectedIds: number[];
}

export default function JobActionsItems(
    menuItemsData: MenuItemsData,
    jobMenuProps: unknown,
): MenuProps['items'] {
    const {
        startEditField,
        jobId,
        taskId,
        projectId,
        pluginActions,
        isMergingConsensusEnabled,
        onOpenBugTracker,
        onImportAnnotations,
        onExportAnnotations,
        onMergeConsensusJob,
        onDeleteJob,
        selectedIds = [],
    } = menuItemsData;

    const isBulkMode = selectedIds.length > 1;
    const bulkAllowedKeys = ['edit_assignee', 'edit_state', 'edit_stage', 'export_job', 'delete'];
    const isDisabled = (key: string): boolean => isBulkMode && !bulkAllowedKeys.includes(key);
    const withCount = LabelWithCountHOF(selectedIds, bulkAllowedKeys);

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'task',
        label: withCount('前往任务', 'task', `/tasks/${taskId}`),
        disabled: isDisabled('task'),
    }, 0]);

    if (projectId) {
        menuItems.push([{
            key: 'project',
            label: withCount('前往项目', 'project', `/projects/${projectId}`),
            disabled: isDisabled('project'),
        }, 10]);
    }

    if (onOpenBugTracker) {
        menuItems.push([{
            key: 'bug_tracker',
            onClick: onOpenBugTracker,
            label: withCount('前往问题跟踪', 'bug_tracker'),
            disabled: isDisabled('bug_tracker'),
        }, 20]);
    }

    menuItems.push([{
        key: 'import_job',
        onClick: onImportAnnotations,
        label: withCount('导入标注', 'import_job'),
        disabled: isDisabled('import_job'),
    }, 30]);

    menuItems.push([{
        key: 'export_job',
        onClick: onExportAnnotations,
        label: withCount('导出标注', 'export_job'),
        disabled: isDisabled('export_job'),
    }, 40]);

    if (onMergeConsensusJob) {
        menuItems.push([{
            key: 'merge_specific_consensus_jobs',
            onClick: onMergeConsensusJob,
            label: withCount('合并共识作业', 'merge_specific_consensus_jobs'),
            disabled: isMergingConsensusEnabled || isDisabled('merge_specific_consensus_jobs'),
            itemIcon: isMergingConsensusEnabled ? <LoadingOutlined /> : undefined,
        }, 50]);
    }

    menuItems.push([{
        key: 'edit_assignee',
        onClick: () => startEditField('assignee'),
        label: <CVATMenuEditLabel>{withCount('负责人', 'edit_assignee')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_assignee'),
    }, 60]);

    menuItems.push([{
        key: 'edit_state',
        onClick: () => startEditField('state'),
        label: <CVATMenuEditLabel>{withCount('状态', 'edit_state')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_state'),
    }, 70]);

    menuItems.push([{
        key: 'edit_stage',
        onClick: () => startEditField('stage'),
        label: <CVATMenuEditLabel>{withCount('阶段', 'edit_stage')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_stage'),
    }, 80]);

    menuItems.push([{
        key: 'view-analytics',
        label: withCount('查看分析', 'view-analytics', `/tasks/${taskId}/jobs/${jobId}/analytics`),
        disabled: isDisabled('view-analytics'),
    }, 90]);

    if (onDeleteJob) {
        menuItems.push([{ type: 'divider' }, 99]);
        menuItems.push([{
            key: 'delete',
            onClick: onDeleteJob,
            label: withCount('删除', 'delete'),
            disabled: isDisabled('delete'),
        }, 100]);
    }

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: jobMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    // Sort and return menu items
    const sortedMenuItems = menuItems.toSorted((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]);
    return sortedMenuItems.map((menuItem) => menuItem[0]);
}

