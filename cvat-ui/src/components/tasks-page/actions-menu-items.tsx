// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd/lib/menu';
import { usePlugins } from 'utils/hooks';
import { LabelWithCountHOF } from 'components/common/label-with-count';
import { CVATMenuEditLabel } from '../common/cvat-menu-edit-label';

interface MenuItemsData {
    taskId: number;
    projectId: number | null;
    isAutomaticAnnotationEnabled: boolean;
    isConsensusEnabled: boolean;
    isMergingConsensusEnabled: boolean;
    pluginActions: ReturnType<typeof usePlugins>;
    onMergeConsensusJobs: (() => void) | null;
    onOpenBugTracker: (() => void) | null;
    onUploadAnnotations: () => void;
    onExportDataset: () => void;
    onBackupTask: () => void;
    onRunAutoAnnotation: (() => void) | null;
    onMoveTaskToProject: () => void;
    onDeleteTask: () => void;
    startEditField: (key: string) => void;
    selectedIds: number[];
}

const bulkAllowedKeys = ['edit_assignee', 'backup_task', 'export_task_dataset', 'delete_task', 'edit_organization'];

export default function TaskActionsItems(menuItemsData: MenuItemsData, taskMenuProps: unknown): MenuProps['items'] {
    const {
        startEditField,
        taskId,
        selectedIds,
        projectId,
        pluginActions,
        isAutomaticAnnotationEnabled,
        isConsensusEnabled,
        isMergingConsensusEnabled,
        onMergeConsensusJobs,
        onUploadAnnotations,
        onExportDataset,
        onOpenBugTracker,
        onBackupTask,
        onRunAutoAnnotation,
        onMoveTaskToProject,
        onDeleteTask,
    } = menuItemsData;

    const isBulkMode = selectedIds.length > 1;
    const isDisabled = (key: string): boolean => isBulkMode && !bulkAllowedKeys.includes(key);
    const withCount = LabelWithCountHOF(selectedIds, bulkAllowedKeys);
    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'load_task_anno',
        onClick: onUploadAnnotations,
        label: withCount('Upload annotations', 'load_task_anno'),
        disabled: isDisabled('load_task_anno'),
    }, 0]);

    menuItems.push([{
        key: 'export_task_dataset',
        onClick: onExportDataset,
        label: withCount('Export task dataset', 'export_task_dataset'),
        disabled: isDisabled('export_task_dataset'),
    }, 10]);

    if (onOpenBugTracker) {
        menuItems.push([{
            key: 'open_bug_tracker',
            onClick: onOpenBugTracker,
            label: withCount('Open bug tracker', 'open_bug_tracker'),
            disabled: isDisabled('open_bug_tracker'),
        }, 20]);
    }

    menuItems.push([{
        disabled: isAutomaticAnnotationEnabled || isDisabled('run_auto_annotation'),
        key: 'run_auto_annotation',
        onClick: onRunAutoAnnotation ?? undefined,
        label: withCount('Automatic annotation', 'run_auto_annotation'),
    }, 30]);

    menuItems.push([{
        key: 'backup_task',
        onClick: onBackupTask,
        label: withCount('Backup Task', 'backup_task'),
        disabled: isDisabled('backup_task'),
    }, 40]);

    menuItems.push([{
        key: 'edit_assignee',
        onClick: () => startEditField('assignee'),
        label: <CVATMenuEditLabel>{withCount('Assignee', 'edit_assignee')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_assignee'),
    }, 50]);

    menuItems.push([{
        key: 'view-analytics',
        label: withCount('View analytics', 'view-analytics', `/tasks/${taskId}/analytics`),
        disabled: isDisabled('view-analytics'),
    }, 60]);

    menuItems.push([{
        key: 'quality_control',
        label: withCount('Quality control', 'quality_control', `/tasks/${taskId}/quality-control`),
        disabled: isDisabled('quality_control'),
    }, 70]);

    if (isConsensusEnabled) {
        menuItems.push([{
            key: 'consensus_management',
            label: withCount('Consensus management', 'consensus_management', `/tasks/${taskId}/consensus`),
            disabled: isDisabled('consensus_management'),
        }, 75]);
    }

    if (onMergeConsensusJobs) {
        menuItems.push([{
            key: 'merge_consensus_jobs',
            onClick: onMergeConsensusJobs,
            label: withCount('Merge consensus jobs', 'merge_consensus_jobs'),
            disabled: isMergingConsensusEnabled || isDisabled('merge_consensus_jobs'),
            itemIcon: isMergingConsensusEnabled ? <LoadingOutlined /> : undefined,
        }, 80]);
    }

    menuItems.push([{ type: 'divider' }, 89]);

    if (!projectId) {
        menuItems.push([{
            key: 'move_task_to_project',
            onClick: onMoveTaskToProject,
            label: withCount('Move to project', 'move_task_to_project'),
            disabled: isDisabled('move_task_to_project'),
        }, 90]);

        menuItems.push([{
            key: 'edit_organization',
            onClick: () => startEditField('organization'),
            label: (
                <CVATMenuEditLabel>
                    {withCount('Organization', 'edit_organization')}
                </CVATMenuEditLabel>
            ),
        }, 100]);
    }

    menuItems.push([{
        key: 'delete_task',
        onClick: onDeleteTask,
        label: withCount('Delete', 'delete_task'),
        disabled: isDisabled('delete_task'),
    }, 110]);

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: taskMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    const sortedMenuItems = menuItems.toSorted((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]);
    return sortedMenuItems.map((menuItem) => menuItem[0]);
}
