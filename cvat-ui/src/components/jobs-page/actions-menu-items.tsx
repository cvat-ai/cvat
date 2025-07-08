// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Link } from 'react-router-dom';
import { MenuProps } from 'antd/lib/menu';
import { LoadingOutlined } from '@ant-design/icons';
import { usePlugins } from 'utils/hooks';
import { CVATMenuEditLabel } from 'components/common/cvat-menu-edit-label';

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
    } = menuItemsData;

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'task',
        label: <Link to={`/tasks/${taskId}`}>Go to the task</Link>,
    }, 0]);

    if (projectId) {
        menuItems.push([{
            key: 'project',
            label: <Link to={`/projects/${projectId}`}>Go to the project</Link>,
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
        key: 'edit_assignee',
        onClick: () => startEditField('assignee'),
        label: <CVATMenuEditLabel>Assignee</CVATMenuEditLabel>,
    }, 60]);

    menuItems.push([{
        key: 'edit_state',
        onClick: () => startEditField('state'),
        label: <CVATMenuEditLabel>State</CVATMenuEditLabel>,
    }, 70]);

    menuItems.push([{
        key: 'edit_stage',
        onClick: () => startEditField('stage'),
        label: <CVATMenuEditLabel>Stage</CVATMenuEditLabel>,
    }, 80]);

    menuItems.push([{
        key: 'view-analytics',
        label: <Link to={`/tasks/${taskId}/jobs/${jobId}/analytics`}>View analytics</Link>,
    }, 90]);

    if (onDeleteJob) {
        menuItems.push([{ type: 'divider' }, 99]);
        menuItems.push([{
            key: 'delete',
            onClick: onDeleteJob,
            label: 'Delete',
        }, 100]);
    }

    menuItems.push(
        ...pluginActions.map(({ component: Component, weight }, index) => {
            const menuItem = Component({ key: index, targetProps: jobMenuProps });
            return [menuItem, weight] as [NonNullable<MenuProps['items']>[0], number];
        }),
    );

    return menuItems.sort((menuItem1, menuItem2) => menuItem1[1] - menuItem2[1]).map((menuItem) => menuItem[0]);
}
