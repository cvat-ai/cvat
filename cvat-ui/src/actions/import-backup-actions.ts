// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { createAction, ActionUnion, ThunkAction } from 'utils/redux';
import { CombinedState } from 'reducers/interfaces';
import { getProjectsAsync } from './projects-actions';
import { Storage } from 'reducers/interfaces';
import getCore from 'cvat-core-wrapper';

const core = getCore();

export enum ImportBackupActionTypes {
    OPEN_IMPORT_BACKUP_MODAL = 'OPEN_IMPORT_BACKUP_MODAL',
    CLOSE_IMPORT_BACKUP_MODAL = 'CLOSE_IMPORT_BACKUP_MODAL',
    IMPORT_BACKUP = 'IMPORT_BACKUP',
    IMPORT_BACKUP_SUCCESS = 'IMPORT_BACKUP_SUCCESS',
    IMPORT_BACKUP_FAILED = 'IMPORT_BACKUP_FAILED',
}

export const importBackupActions = {
    openImportModal: (instanceType: 'project' | 'task' | null) => (
        createAction(ImportBackupActionTypes.OPEN_IMPORT_BACKUP_MODAL, { instanceType })
    ),
    closeImportModal: () => createAction(ImportBackupActionTypes.CLOSE_IMPORT_BACKUP_MODAL),
    importBackup: () => createAction(ImportBackupActionTypes.IMPORT_BACKUP),
    importBackupSuccess: (instanceId: number, instanceType: 'project' | 'task') => (
        createAction(ImportBackupActionTypes.IMPORT_BACKUP_SUCCESS, { instanceId, instanceType })
    ),
    importBackupFailed: (instanceType: 'project' | 'task', error: any) => (
        createAction(ImportBackupActionTypes.IMPORT_BACKUP_FAILED, { instanceType, error })
    ),
};

export const importBackupAsync = (instanceType: 'project' | 'task', storage: any, file: File | null, fileName: string | null): ThunkAction => (
    async (dispatch) => {
        dispatch(importBackupActions.importBackup());
        try {
            const inctanceClass = (instanceType === 'task') ? core.classes.Task : core.classes.Project;
            const instance = await inctanceClass.import(storage, file, fileName);
            dispatch(importBackupActions.importBackupSuccess(instance.id, instanceType));
        } catch (error) {
            dispatch(importBackupActions.importBackupFailed(instanceType, error));
        }
});

export type ImportBackupActions = ActionUnion<typeof importBackupActions>;
