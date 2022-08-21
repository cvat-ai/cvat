// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { createAction, ActionUnion, ThunkAction } from 'utils/redux';
import { CombinedState } from 'reducers';
import { getProjectsAsync } from './projects-actions';
import { Storage } from 'reducers';
import { getCore } from 'cvat-core-wrapper';
import { LogType } from 'cvat-logger';

import { jobInfoGenerator, receiveAnnotationsParameters, AnnotationActionTypes } from 'actions/annotation-actions';

const core = getCore();

export enum ImportActionTypes {
    OPEN_IMPORT_MODAL = 'OPEN_IMPORT_MODAL',
    CLOSE_IMPORT_MODAL = 'CLOSE_IMPORT_MODAL',
    IMPORT_DATASET = 'IMPORT_DATASET',
    IMPORT_DATASET_SUCCESS = 'IMPORT_DATASET_SUCCESS',
    IMPORT_DATASET_FAILED = 'IMPORT_DATASET_FAILED',
    IMPORT_DATASET_UPDATE_STATUS = 'IMPORT_DATASET_UPDATE_STATUS',
}

export const importActions = {
    openImportModal: (instance: any, resource: 'dataset' | 'annotation') =>
        createAction(ImportActionTypes.OPEN_IMPORT_MODAL, { instance, resource }),
    closeImportModal: (instance: any) =>
        createAction(ImportActionTypes.CLOSE_IMPORT_MODAL, { instance }),
    importDataset: (instance: any, format: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET, { instance, format })
    ),
    importDatasetSuccess: (instance: any, resource: 'dataset' | 'annotation') => (
        createAction(ImportActionTypes.IMPORT_DATASET_SUCCESS, { instance, resource })
    ),
    importDatasetFailed: (instance: any, resource: 'dataset' | 'annotation', error: any) => (
        createAction(ImportActionTypes.IMPORT_DATASET_FAILED, {
            instance,
            resource,
            error,
        })
    ),
    importDatasetUpdateStatus: (instance: any, progress: number, status: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET_UPDATE_STATUS, { instance, progress, status })
    ),
};

export const importDatasetAsync = (
    instance: any,
    format: string,
    useDefaultSettings: boolean,
    sourceStorage: Storage,
    file: File | string
): ThunkAction => (
    async (dispatch, getState) => {
        const resource = instance instanceof core.classes.Project ? 'dataset' : 'annotation';

        try {
            const state: CombinedState = getState();

            if (instance instanceof core.classes.Project) {
                if (state.import.projects?.activities[instance.id]) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                dispatch(importActions.importDataset(instance, format));
                await instance.annotations.importDataset(format, useDefaultSettings, sourceStorage, file, (message: string, progress: number) => (
                    dispatch(importActions.importDatasetUpdateStatus(instance, Math.floor(progress * 100), message))
                ));
            } else if (instance instanceof core.classes.Task) {
                if (state.import.tasks?.activities[instance.id]) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                dispatch(importActions.importDataset(instance, format));
                await instance.annotations.upload(format, useDefaultSettings, sourceStorage, file);
            } else { // job
                if (state.import.tasks?.activities[instance.taskId]) {
                    throw Error('Annotations is being uploaded for the task');
                }
                if (state.import.jobs?.activities[instance.id]) {
                    throw Error('Only one uploading of annotations for a job allowed at the same time');
                }
                const { filters, showAllInterpolationTracks } = receiveAnnotationsParameters();

                dispatch(importActions.importDataset(instance, format));

                const frame = state.annotation.player.frame.number;
                await instance.annotations.upload(format, useDefaultSettings, sourceStorage, file);

                await instance.logger.log(LogType.uploadAnnotations, {
                    ...(await jobInfoGenerator(instance)),
                });

                await instance.annotations.clear(true);
                await instance.actions.clear();
                const history = await instance.actions.get();

                // // One more update to escape some problems
                // // in canvas when shape with the same
                // // clientID has different type (polygon, rectangle) for example
                dispatch({
                    type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS,
                    payload: {
                        states: [],
                        history,
                    },
                });

                const states = await instance.annotations.get(frame, showAllInterpolationTracks, filters);

                setTimeout(() => {
                    dispatch({
                        type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS,
                        payload: {
                            history,
                            states,
                        },
                    });
                });
            }
        } catch (error) {
            dispatch(importActions.importDatasetFailed(instance, resource, error));
            return;
        }

        dispatch(importActions.importDatasetSuccess(instance, resource));
        if (instance instanceof core.classes.Project) {
            dispatch(getProjectsAsync({ id: instance.id }, getState().projects.tasksGettingQuery));
        }
    }
);

export type ImportActions = ActionUnion<typeof importActions>;
