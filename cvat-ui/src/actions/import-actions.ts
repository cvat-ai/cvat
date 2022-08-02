// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { createAction, ActionUnion, ThunkAction } from 'utils/redux';
import { CombinedState } from 'reducers/interfaces';
import { getProjectsAsync } from './projects-actions';
import { Storage } from 'reducers/interfaces';
import getCore from 'cvat-core-wrapper';

const core = getCore();

export enum ImportActionTypes {
    OPEN_IMPORT_MODAL = 'OPEN_IMPORT_MODAL',
    CLOSE_IMPORT_MODAL = 'CLOSE_IMPORT_MODAL',
    IMPORT_DATASET = 'IMPORT_DATASET',
    IMPORT_DATASET_SUCCESS = 'IMPORT_DATASET_SUCCESS',
    IMPORT_DATASET_FAILED = 'IMPORT_DATASET_FAILED',
    IMPORT_UPDATE_STATUS = 'IMPORT_UPDATE_STATUS',
}

export const importActions = {
    openImportModal: (instance: any, instanceType: any, resource: 'dataset' | 'annotation') =>
        createAction(ImportActionTypes.OPEN_IMPORT_MODAL, { instance, instanceType, resource }),
    closeImportModal: (instance: any) =>
        createAction(ImportActionTypes.CLOSE_IMPORT_MODAL, { instance }),
    importDataset: (instance: any, format: string) => (
        createAction(ImportActionTypes.IMPORT_DATASET, { instance, format })
    ),
    importDatasetSuccess: (instance: any) => (
        createAction(ImportActionTypes.IMPORT_DATASET_SUCCESS, { instance })
    ),
    importDatasetFailed: (instance: any, error: any) => (
        createAction(ImportActionTypes.IMPORT_DATASET_FAILED, {
            instance,
            error,
        })
    ),
    importUpdateStatus: (instance: any, progress: number, status: string) => (
        createAction(ImportActionTypes.IMPORT_UPDATE_STATUS, { instance, progress, status })
    ),
};

export const importDatasetAsync = (instance: any, format: string, useDefaultSettings: boolean, sourceStorage: Storage, file: File | null, fileName: string | null): ThunkAction => (
    async (dispatch, getState) => {
        try {
            const state: CombinedState = getState();
            // if (state.import.importingId !== null) {
            //     throw Error('Only one importing of annotation/dataset allowed at the same time');
            // }
            // dispatch(importActions.importDataset(instance.id, format));
            if (instance instanceof core.classes.Project) {
                // TODO change importingId
                if (state.import.projects?.instance !== null) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                dispatch(importActions.importDataset(instance, format));
                await instance.annotations.importDataset(format, useDefaultSettings, sourceStorage, file, fileName, (message: string, progress: number) => (
                    dispatch(importActions.importUpdateStatus(instance, Math.floor(progress * 100), message))
                ));
            } else if (instance instanceof core.classes.Task) {
                if (state.import.tasks?.instance !== null) {
                    throw Error('Only one importing of annotation/dataset allowed at the same time');
                }
                dispatch(importActions.importDataset(instance, format));
                // await task.annotations.upload(file, loader);
                await instance.annotations.upload(format, useDefaultSettings, sourceStorage, file, fileName, (message: string, progress: number) => (
                    dispatch(importActions.importUpdateStatus(instance, Math.floor(progress * 100), message))
                ));
            } else { // job
                // if (state.tasks.activities.loads[job.taskId]) {
                //     throw Error('Annotations is being uploaded for the task');
                // }
                // if (state.annotation.activities.loads[job.id]) {
                //     throw Error('Only one uploading of annotations for a job allowed at the same time');
                // }
                // const frame = state.annotation.player.frame.number;
                // await job.annotations.upload(file, loader);

                // await job.logger.log(LogType.uploadAnnotations, {
                //     ...(await jobInfoGenerator(job)),
                // });

                // await job.annotations.clear(true);
                // await job.actions.clear();
                // const history = await job.actions.get();

                // // One more update to escape some problems
                // // in canvas when shape with the same
                // // clientID has different type (polygon, rectangle) for example
                // dispatch({
                //     type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS,
                //     payload: {
                //         job,
                //         states: [],
                //         history,
                //     },
                // });

                // const states = await job.annotations.get(frame, showAllInterpolationTracks, filters);

                // setTimeout(() => {
                //     dispatch({
                //         type: AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS,
                //         payload: {
                //             history,
                //             job,
                //             states,
                //         },
                //     });
                // });
            }
        } catch (error) {
            dispatch(importActions.importDatasetFailed(instance, error));
            return;
        }

        dispatch(importActions.importDatasetSuccess(instance));
        if (instance instanceof core.classes.Project) {
            dispatch(getProjectsAsync({ id: instance.id }, getState().projects.tasksGettingQuery));
        }
    }
);

export type ImportActions = ActionUnion<typeof importActions>;
