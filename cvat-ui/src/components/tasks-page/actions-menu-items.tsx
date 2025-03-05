// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd/lib/menu';
import { usePlugins } from 'utils/hooks';

interface MenuItemsData {
    isAutomaticAnnotationEnabled: boolean;
    isMergingConsensusEnabled: boolean;
    pluginActions: ReturnType<typeof usePlugins>;
    onOpenQualityControl: () => void;
    onOpenConsensusManagement: (() => void) | null;
    onMergeConsensusJobs: (() => void) | null;
    onOpenBugTracker: (() => void) | null;
    onUploadAnnotations: () => void;
    onExportDataset: () => void;
    onBackupTask: () => void;
    onRunAutoAnnotation: (() => void) | null;
    onMoveTaskToProject: (() => void) | null;
    onDeleteTask: () => void;
}

export default function TaskActionsItems(menuItemsData: MenuItemsData, taskMenuProps: unknown): MenuProps['items'] {
    const {
        pluginActions,
        isAutomaticAnnotationEnabled,
        isMergingConsensusEnabled,
        onOpenQualityControl,
        onOpenConsensusManagement,
        onMergeConsensusJobs,
        onUploadAnnotations,
        onExportDataset,
        onOpenBugTracker,
        onBackupTask,
        onRunAutoAnnotation,
        onMoveTaskToProject,
        onDeleteTask,
    } = menuItemsData;

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'load_task_anno',
        onClick: onUploadAnnotations,
        label: 'Upload annotations',
    }, 0]);

    menuItems.push([{
        key: 'export_task_dataset',
        onClick: onExportDataset,
        label: 'Export task dataset',
    }, 10]);

    if (onOpenBugTracker) {
        menuItems.push([{
            key: 'open_bug_tracker',
            onClick: onOpenBugTracker,
            label: 'Open bug tracker',
        }, 20]);
    }

    menuItems.push([{
        disabled: isAutomaticAnnotationEnabled,
        key: 'run_auto_annotation',
        onClick: onRunAutoAnnotation ?? undefined,
        label: 'Automatic annotation',
    }, 30]);

    menuItems.push([{
        key: 'backup_task',
        onClick: onBackupTask,
        label: 'Backup Task',
    }, 40]);

    menuItems.push([{
        key: 'quality_control',
        onClick: onOpenQualityControl,
        label: 'Quality control',
    }, 50]);

    if (onOpenConsensusManagement) {
        menuItems.push([{
            key: 'consensus_management',
            onClick: onOpenConsensusManagement,
            label: 'Consensus management',
        }, 55]);
    }

    if (onMergeConsensusJobs) {
        menuItems.push([{
            key: 'merge_consensus_jobs',
            onClick: onMergeConsensusJobs,
            label: 'Merge consensus jobs',
            disabled: isMergingConsensusEnabled,
            itemIcon: isMergingConsensusEnabled ? <LoadingOutlined /> : undefined,
        }, 60]);
    }

    if (onMoveTaskToProject) {
        menuItems.push([{
            key: 'move_task_to_project',
            onClick: onMoveTaskToProject,
            label: 'Move to project',
        }, 70]);
    }

    menuItems.push([{ type: 'divider' }, 79]);
    menuItems.push([{
        key: 'delete_task',
        onClick: onDeleteTask,
        label: 'Delete',
    }, 80]);

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: taskMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    return menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]).map((menuItem) => menuItem[0]);
}
