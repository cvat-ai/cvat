// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';
import ActionsMenuComponent, { Actions } from 'components/actions-menu/actions-menu';
import { CombinedState } from 'reducers';

import { modelsActions } from 'actions/models-actions';
import {
    deleteTaskAsync,
    switchMoveTaskModalVisible,
} from 'actions/tasks-actions';
import { exportActions } from 'actions/export-actions';
import { importActions } from 'actions/import-actions';

interface OwnProps {
    taskInstance: any;
    onViewAnalytics: () => void;
}

interface StateToProps {
    annotationFormats: any;
    inferenceIsActive: boolean;
    backupIsActive: boolean;
}

interface DispatchToProps {
    showExportModal: (taskInstance: any, resource: 'dataset' | 'backup') => void;
    showImportModal: (taskInstance: any) => void;
    openRunModelWindow: (taskInstance: any) => void;
    deleteTask: (taskInstance: any) => void;
    openMoveTaskToProjectWindow: (taskInstance: any) => void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        taskInstance: { id: tid },
    } = own;

    const {
        formats: { annotationFormats },
    } = state;

    return {
        annotationFormats,
        inferenceIsActive: tid in state.models.inferences,
        backupIsActive: state.export.tasks.backup.current[tid],
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        showExportModal: (taskInstance: any, resource: 'dataset' | 'backup'): void => {
            if (resource === 'dataset') {
                dispatch(exportActions.openExportDatasetModal(taskInstance));
            } else {
                dispatch(exportActions.openExportBackupModal(taskInstance));
            }
        },
        showImportModal: (taskInstance: any): void => {
            dispatch(importActions.openImportDatasetModal(taskInstance));
        },
        deleteTask: (taskInstance: any): void => {
            dispatch(deleteTaskAsync(taskInstance));
        },
        openRunModelWindow: (taskInstance: any): void => {
            dispatch(modelsActions.showRunModelDialog(taskInstance));
        },
        openMoveTaskToProjectWindow: (taskId: number): void => {
            dispatch(switchMoveTaskModalVisible(true, taskId));
        },
    };
}

function ActionsMenuContainer(props: OwnProps & StateToProps & DispatchToProps): JSX.Element {
    const {
        taskInstance,
        annotationFormats: { loaders, dumpers },
        inferenceIsActive,
        backupIsActive,
        showExportModal,
        showImportModal,
        deleteTask,
        openRunModelWindow,
        openMoveTaskToProjectWindow,
        onViewAnalytics,
    } = props;
    const onClickMenu = (params: MenuInfo): void | JSX.Element => {
        const [action] = params.keyPath;
        if (action === Actions.EXPORT_TASK_DATASET) {
            showExportModal(taskInstance, 'dataset');
        } else if (action === Actions.DELETE_TASK) {
            deleteTask(taskInstance);
        } else if (action === Actions.OPEN_BUG_TRACKER) {
            window.open(`${taskInstance.bugTracker}`, '_blank');
        } else if (action === Actions.RUN_AUTO_ANNOTATION) {
            openRunModelWindow(taskInstance);
        } else if (action === Actions.BACKUP_TASK) {
            showExportModal(taskInstance, 'backup');
        } else if (action === Actions.MOVE_TASK_TO_PROJECT) {
            openMoveTaskToProjectWindow(taskInstance.id);
        } else if (action === Actions.LOAD_TASK_ANNO) {
            showImportModal(taskInstance);
        } else if (action === Actions.VIEW_ANALYTICS) {
            onViewAnalytics();
        }
    };

    return (
        <ActionsMenuComponent
            taskID={taskInstance.id}
            projectID={taskInstance.projectId}
            taskMode={taskInstance.mode}
            bugTracker={taskInstance.bugTracker}
            loaders={loaders}
            dumpers={dumpers}
            inferenceIsActive={inferenceIsActive}
            onClickMenu={onClickMenu}
            taskDimension={taskInstance.dimension}
            backupIsActive={backupIsActive}
        />
    );
}

export default connect(mapStateToProps, mapDispatchToProps)(ActionsMenuContainer);
