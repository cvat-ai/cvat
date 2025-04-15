// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { MenuProps } from 'antd/lib/menu';
import { LoadingOutlined } from '@ant-design/icons';
import { usePlugins } from 'utils/hooks';

interface MenuItemsData {
    jobID: number;
    taskID: number;
    projectID: number | null;
    pluginActions: ReturnType<typeof usePlugins>;
    isMergingConsensusEnabled: boolean;
    onOpenBugTracker: (() => void) | null;
    onImportAnnotations: () => void;
    onExportAnnotations: () => void;
    onMergeConsensusJob: (() => void) | null;
    onDeleteJob: (() => void) | null;
}

export default function JobActionsItems(
    menuItemsData: MenuItemsData,
    jobMenuProps: unknown,
): MenuProps['items'] {
    const {
        jobID,
        taskID,
        projectID,
        pluginActions,
        isMergingConsensusEnabled,
        onOpenBugTracker,
        onImportAnnotations,
        onExportAnnotations,
        onMergeConsensusJob,
        onDeleteJob,
    } = menuItemsData;

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'task',
        label: <Link to={`/tasks/${taskID}`}>Go to the task</Link>,
    }, 0]);

    if (projectID) {
        menuItems.push([{
            key: 'project',
            label: <Link to={`/projects/${projectID}`}>Go to the project</Link>,
        }, 10]);
    }

    if (onOpenBugTracker) {
        menuItems.push([{
            key: 'bug_tracker',
            onClick: onOpenBugTracker,
            label: 'Go to the bug tracker',
        }, 20]);
    }

    menuItems.push([{
        key: 'import_job',
        onClick: onImportAnnotations,
        label: 'Import annotations',
    }, 30]);

    menuItems.push([{
        key: 'export_job',
        onClick: onExportAnnotations,
        label: 'Export annotations',
    }, 40]);

    if (onMergeConsensusJob) {
        menuItems.push([{
            key: 'merge_specific_consensus_jobs',
            onClick: onMergeConsensusJob,
            label: 'Merge consensus job',
            disabled: isMergingConsensusEnabled,
            itemIcon: isMergingConsensusEnabled ? <LoadingOutlined /> : undefined,
        }, 50]);
    }

    menuItems.push([{
        key: 'view-analytics',
        label: <Link to={`/tasks/${taskID}/jobs/${jobID}/analytics`}>View analytics</Link>,
    }, 60]);

    if (onDeleteJob) {
        menuItems.push([{ type: 'divider' }, 69]);
        menuItems.push([{
            key: 'delete',
            onClick: onDeleteJob,
            label: 'Delete',
        }, 70]);
    }

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: jobMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    return menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]).map((menuItem) => menuItem[0]);
}
