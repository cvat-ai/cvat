// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { MenuProps } from 'antd/lib/menu';
import { LoadingOutlined } from '@ant-design/icons';
import { usePlugins } from 'utils/hooks';
import { CVATMenuEditLabel } from 'components/common/cvat-menu-edit-label';
import { LabelWithCountHOF } from 'components/common/label-with-count';
import { Job, JobType } from 'cvat-core-wrapper';

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
    onGoToParent: (() => void) | null;
    onGoToReplicas: (() => void) | null;
    startEditField: (key: string) => void;
    jobsToAct: Job[];
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
        jobsToAct,
        onGoToParent,
        onGoToReplicas,
    } = menuItemsData;

    const isBulkMode = jobsToAct.length > 1;
    const bulkAllowedKeys = [
        'edit_assignee', 'edit_state', 'edit_stage', 'export_job', 'delete',
        'go_to_parent', 'go_to_replicas',
    ];
    const isDisabled = (key: string): boolean => isBulkMode && !bulkAllowedKeys.includes(key);

    const jobsToActWithParents = jobsToAct.filter((j) => j.parentJobId != null);
    const jobsToActWithReplicas = jobsToAct.filter((j) => j.replicasCount > 0);

    const actionsApplicable = {
        edit_assignee: jobsToAct,
        edit_state: jobsToAct,
        edit_stage: jobsToAct,
        export_job: jobsToAct,
        delete: jobsToAct.filter((j) => j.type === JobType.GROUND_TRUTH),
        go_to_parent: jobsToActWithParents,
        go_to_replicas: jobsToActWithReplicas,
    };

    const withCount = LabelWithCountHOF(jobsToAct, bulkAllowedKeys, actionsApplicable);

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: 'task',
        label: withCount('Go to the task', 'task', `/tasks/${taskId}`),
        disabled: isDisabled('task'),
    }, 0]);

    if (jobsToActWithParents.length) {
        menuItems.push([{
            key: 'go_to_parent',
            onClick: onGoToParent,
            label: withCount('Go to parent', 'go_to_parent'),
            disabled: isDisabled('go_to_parent'),
        }, 10]);
    }
    if (jobsToActWithReplicas.length) {
        menuItems.push([{
            key: 'go_to_replicas',
            onClick: onGoToReplicas,
            label: withCount('Go to replicas', 'go_to_replicas'),
            disabled: isDisabled('go_to_replicas'),
        }, 20]);
    }

    if (projectId) {
        menuItems.push([{
            key: 'project',
            label: withCount('Go to the project', 'project', `/projects/${projectId}`),
            disabled: isDisabled('project'),
        }, 30]);
    }

    if (onOpenBugTracker) {
        menuItems.push([{
            key: 'bug_tracker',
            onClick: onOpenBugTracker,
            label: withCount('Go to the bug tracker', 'bug_tracker'),
            disabled: isDisabled('bug_tracker'),
        }, 40]);
    }

    menuItems.push([{
        key: 'import_job',
        onClick: onImportAnnotations,
        label: withCount('Import annotations', 'import_job'),
        disabled: isDisabled('import_job'),
    }, 50]);

    menuItems.push([{
        key: 'export_job',
        onClick: onExportAnnotations,
        label: withCount('Export annotations', 'export_job'),
        disabled: isDisabled('export_job'),
    }, 60]);

    if (onMergeConsensusJob) {
        menuItems.push([{
            key: 'merge_specific_consensus_jobs',
            onClick: onMergeConsensusJob,
            label: withCount('Merge consensus job', 'merge_specific_consensus_jobs'),
            disabled: isMergingConsensusEnabled || isDisabled('merge_specific_consensus_jobs'),
            itemIcon: isMergingConsensusEnabled ? <LoadingOutlined /> : undefined,
        }, 70]);
    }

    menuItems.push([{
        key: 'edit_assignee',
        onClick: () => startEditField('assignee'),
        label: <CVATMenuEditLabel>{withCount('Assignee', 'edit_assignee')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_assignee'),
    }, 80]);

    menuItems.push([{
        key: 'edit_state',
        onClick: () => startEditField('state'),
        label: <CVATMenuEditLabel>{withCount('State', 'edit_state')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_state'),
    }, 90]);

    menuItems.push([{
        key: 'edit_stage',
        onClick: () => startEditField('stage'),
        label: <CVATMenuEditLabel>{withCount('Stage', 'edit_stage')}</CVATMenuEditLabel>,
        disabled: isDisabled('edit_stage'),
    }, 100]);

    menuItems.push([{
        key: 'view-analytics',
        label: withCount('View analytics', 'view-analytics', `/tasks/${taskId}/jobs/${jobId}/analytics`),
        disabled: isDisabled('view-analytics'),
    }, 110]);

    if (onDeleteJob) {
        menuItems.push([{ type: 'divider' }, 119]);
        menuItems.push([{
            key: 'delete',
            onClick: onDeleteJob,
            label: withCount('Delete', 'delete'),
            disabled: isDisabled('delete'),
        }, 120]);
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
