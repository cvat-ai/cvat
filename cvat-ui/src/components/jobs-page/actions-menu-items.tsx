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

enum MenuKeys {
    EDIT_ASSIGNEE = 'edit_assignee',
    EDIT_STATE = 'edit_state',
    EDIT_STAGE = 'edit_stage',
    EXPORT_JOB = 'export_job',
    DELETE = 'delete',
    GO_TO_PARENT = 'go_to_parent',
    GO_TO_REPLICAS = 'go_to_replicas',
    VIEW_ANALYTICS = 'view-analytics',
    MERGE_SPECIFIC_CONSENSUS_JOBS = 'merge_specific_consensus_jobs',
    IMPORT_JOB = 'import_job',
    BUG_TRACKER = 'bug_tracker',
    PROJECT = 'project',
    TASK = 'task',
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
        MenuKeys.EDIT_ASSIGNEE, MenuKeys.EDIT_STATE, MenuKeys.EDIT_STAGE, MenuKeys.EXPORT_JOB,
        MenuKeys.DELETE, MenuKeys.GO_TO_PARENT, MenuKeys.GO_TO_REPLICAS,
    ];
    const isDisabled = (key: string): boolean => isBulkMode && !bulkAllowedKeys.includes(key);

    const jobsToActWithParents = jobsToAct.filter((j) => j.parentJobId != null);
    const jobsToActWithReplicas = jobsToAct.filter((j) => j.replicasCount > 0);

    const actionsApplicable = {
        [MenuKeys.EDIT_ASSIGNEE]: jobsToAct,
        [MenuKeys.EDIT_STATE]: jobsToAct,
        [MenuKeys.EDIT_STAGE]: jobsToAct,
        [MenuKeys.EXPORT_JOB]: jobsToAct,
        [MenuKeys.DELETE]: jobsToAct.filter((j) => j.type === JobType.GROUND_TRUTH),
        [MenuKeys.GO_TO_PARENT]: jobsToActWithParents,
        [MenuKeys.GO_TO_REPLICAS]: jobsToActWithReplicas,
    };

    const idsToAct = jobsToAct.map((j) => j.id);
    const withCount = LabelWithCountHOF(idsToAct, bulkAllowedKeys, actionsApplicable);

    const menuItems: [NonNullable<MenuProps['items']>[0], number][] = [];

    menuItems.push([{
        key: MenuKeys.TASK,
        label: withCount('Go to the task', MenuKeys.TASK, `/tasks/${taskId}`),
        disabled: isDisabled(MenuKeys.TASK),
    }, 0]);

    if (jobsToActWithParents.length && onGoToParent) {
        menuItems.push([{
            key: MenuKeys.GO_TO_PARENT,
            onClick: onGoToParent,
            label: withCount('Go to parent', MenuKeys.GO_TO_PARENT),
            disabled: isDisabled(MenuKeys.GO_TO_PARENT),
        }, 10]);
    }
    if (jobsToActWithReplicas.length && onGoToReplicas) {
        menuItems.push([{
            key: MenuKeys.GO_TO_REPLICAS,
            onClick: onGoToReplicas,
            label: withCount('Go to replicas', MenuKeys.GO_TO_REPLICAS),
            disabled: isDisabled(MenuKeys.GO_TO_REPLICAS),
        }, 20]);
    }

    if (projectId) {
        menuItems.push([{
            key: MenuKeys.PROJECT,
            label: withCount('Go to the project', MenuKeys.PROJECT, `/projects/${projectId}`),
            disabled: isDisabled(MenuKeys.PROJECT),
        }, 30]);
    }

    if (onOpenBugTracker) {
        menuItems.push([{
            key: MenuKeys.BUG_TRACKER,
            onClick: onOpenBugTracker,
            label: withCount('Go to the bug tracker', MenuKeys.BUG_TRACKER),
            disabled: isDisabled(MenuKeys.BUG_TRACKER),
        }, 40]);
    }

    menuItems.push([{
        key: MenuKeys.IMPORT_JOB,
        onClick: onImportAnnotations,
        label: withCount('Import annotations', MenuKeys.IMPORT_JOB),
        disabled: isDisabled(MenuKeys.IMPORT_JOB),
    }, 50]);

    menuItems.push([{
        key: MenuKeys.EXPORT_JOB,
        onClick: onExportAnnotations,
        label: withCount('Export annotations', MenuKeys.EXPORT_JOB),
        disabled: isDisabled(MenuKeys.EXPORT_JOB),
    }, 60]);

    if (onMergeConsensusJob) {
        menuItems.push([{
            key: MenuKeys.MERGE_SPECIFIC_CONSENSUS_JOBS,
            onClick: onMergeConsensusJob,
            label: withCount('Merge consensus job', MenuKeys.MERGE_SPECIFIC_CONSENSUS_JOBS),
            disabled: isMergingConsensusEnabled || isDisabled(MenuKeys.MERGE_SPECIFIC_CONSENSUS_JOBS),
            itemIcon: isMergingConsensusEnabled ? <LoadingOutlined /> : undefined,
        }, 70]);
    }

    menuItems.push([{
        key: MenuKeys.EDIT_ASSIGNEE,
        onClick: () => startEditField('assignee'),
        label: <CVATMenuEditLabel>{withCount('Assignee', MenuKeys.EDIT_ASSIGNEE)}</CVATMenuEditLabel>,
        disabled: isDisabled(MenuKeys.EDIT_ASSIGNEE),
    }, 80]);

    menuItems.push([{
        key: MenuKeys.EDIT_STATE,
        onClick: () => startEditField('state'),
        label: <CVATMenuEditLabel>{withCount('State', MenuKeys.EDIT_STATE)}</CVATMenuEditLabel>,
        disabled: isDisabled(MenuKeys.EDIT_STATE),
    }, 90]);

    menuItems.push([{
        key: MenuKeys.EDIT_STAGE,
        onClick: () => startEditField('stage'),
        label: <CVATMenuEditLabel>{withCount('Stage', MenuKeys.EDIT_STAGE)}</CVATMenuEditLabel>,
        disabled: isDisabled(MenuKeys.EDIT_STAGE),
    }, 100]);

    menuItems.push([{
        key: MenuKeys.VIEW_ANALYTICS,
        label: withCount('View analytics', MenuKeys.VIEW_ANALYTICS, `/tasks/${taskId}/jobs/${jobId}/analytics`),
        disabled: isDisabled(MenuKeys.VIEW_ANALYTICS),
    }, 110]);

    if (onDeleteJob) {
        menuItems.push([{ type: 'divider' }, 119]);
        menuItems.push([{
            key: MenuKeys.DELETE,
            onClick: onDeleteJob,
            label: withCount('Delete', MenuKeys.DELETE),
            disabled: isDisabled(MenuKeys.DELETE),
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
