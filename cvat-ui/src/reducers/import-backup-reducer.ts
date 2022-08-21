// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ImportBackupActions, ImportBackupActionTypes } from 'actions/import-backup-actions';
import { ImportBackupState } from '.';

const defaultState: ImportBackupState = {
    isTaskImported: false,
    isProjectImported: false,
    instanceType: null,
    modalVisible: false,
};

export default (state: ImportBackupState = defaultState, action: ImportBackupActions): ImportBackupState => {
    switch (action.type) {
        case ImportBackupActionTypes.OPEN_IMPORT_BACKUP_MODAL:
            return {
                ...state,
                modalVisible: true,
                instanceType: action.payload.instanceType,
            };
        case ImportBackupActionTypes.CLOSE_IMPORT_BACKUP_MODAL: {
            return {
                ...state,
                modalVisible: false,
            };
        }
        case ImportBackupActionTypes.IMPORT_BACKUP: {
            const { instanceType } = state;
            const field = (instanceType === 'project') ? 'isProjectImported' : 'isTaskImported';

            return {
                ...state,
                [field]: true,
            };
        }
        case ImportBackupActionTypes.IMPORT_BACKUP_FAILED:
        case ImportBackupActionTypes.IMPORT_BACKUP_SUCCESS: {
            const { instanceType } = state;
            const field = (instanceType === 'project') ? 'isProjectImported' : 'isTaskImported';

            return {
                ...state,
                instanceType: null,
                [field]: false,
            };
        }
        default:
            return state;
    }
};
