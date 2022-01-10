// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Dispatch, ActionCreator } from 'redux';

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { ProjectsQuery, TasksQuery, CombinedState } from 'reducers/interfaces';
import { getTasksAsync } from 'actions/tasks-actions';
import { getCVATStore } from 'cvat-store';
import getCore from 'cvat-core-wrapper';

const cvat = getCore();

export enum ProjectsActionTypes {
    UPDATE_PROJECTS_GETTING_QUERY = 'UPDATE_PROJECTS_GETTING_QUERY',
    GET_PROJECTS = 'GET_PROJECTS',
    GET_PROJECTS_SUCCESS = 'GET_PROJECTS_SUCCESS',
    GET_PROJECTS_FAILED = 'GET_PROJECTS_FAILED',
    CREATE_PROJECT = 'CREATE_PROJECT',
    CREATE_PROJECT_SUCCESS = 'CREATE_PROJECT_SUCCESS',
    CREATE_PROJECT_FAILED = 'CREATE_PROJECT_FAILED',
    UPDATE_PROJECT = 'UPDATE_PROJECT',
    UPDATE_PROJECT_SUCCESS = 'UPDATE_PROJECT_SUCCESS',
    UPDATE_PROJECT_FAILED = 'UPDATE_PROJECT_FAILED',
    DELETE_PROJECT = 'DELETE_PROJECT',
    DELETE_PROJECT_SUCCESS = 'DELETE_PROJECT_SUCCESS',
    DELETE_PROJECT_FAILED = 'DELETE_PROJECT_FAILED',
    BACKUP_PROJECT = 'BACKUP_PROJECT',
    BACKUP_PROJECT_SUCCESS = 'BACKUP_PROJECT_SUCCESS',
    BACKUP_PROJECT_FAILED = 'BACKUP_PROJECT_FAILED',
    RESTORE_PROJECT = 'IMPORT_PROJECT',
    RESTORE_PROJECT_SUCCESS = 'IMPORT_PROJECT_SUCCESS',
    RESTORE_PROJECT_FAILED = 'IMPORT_PROJECT_FAILED',
}

// prettier-ignore
const projectActions = {
    getProjects: () => createAction(ProjectsActionTypes.GET_PROJECTS),
    getProjectsSuccess: (array: any[], previews: string[], count: number) => (
        createAction(ProjectsActionTypes.GET_PROJECTS_SUCCESS, { array, previews, count })
    ),
    getProjectsFailed: (error: any) => createAction(ProjectsActionTypes.GET_PROJECTS_FAILED, { error }),
    updateProjectsGettingQuery: (query: Partial<ProjectsQuery>, tasksQuery: Partial<TasksQuery> = {}) => (
        createAction(ProjectsActionTypes.UPDATE_PROJECTS_GETTING_QUERY, { query, tasksQuery })
    ),
    createProject: () => createAction(ProjectsActionTypes.CREATE_PROJECT),
    createProjectSuccess: (projectId: number) => (
        createAction(ProjectsActionTypes.CREATE_PROJECT_SUCCESS, { projectId })
    ),
    createProjectFailed: (error: any) => createAction(ProjectsActionTypes.CREATE_PROJECT_FAILED, { error }),
    updateProject: () => createAction(ProjectsActionTypes.UPDATE_PROJECT),
    updateProjectSuccess: (project: any) => createAction(ProjectsActionTypes.UPDATE_PROJECT_SUCCESS, { project }),
    updateProjectFailed: (project: any, error: any) => (
        createAction(ProjectsActionTypes.UPDATE_PROJECT_FAILED, { project, error })
    ),
    deleteProject: (projectId: number) => createAction(ProjectsActionTypes.DELETE_PROJECT, { projectId }),
    deleteProjectSuccess: (projectId: number) => (
        createAction(ProjectsActionTypes.DELETE_PROJECT_SUCCESS, { projectId })
    ),
    deleteProjectFailed: (projectId: number, error: any) => (
        createAction(ProjectsActionTypes.DELETE_PROJECT_FAILED, { projectId, error })
    ),
    backupProject: (projectId: number) => createAction(ProjectsActionTypes.BACKUP_PROJECT, { projectId }),
    backupProjectSuccess: (projectID: number) => (
        createAction(ProjectsActionTypes.BACKUP_PROJECT_SUCCESS, { projectID })
    ),
    backupProjectFailed: (projectID: number, error: any) => (
        createAction(ProjectsActionTypes.BACKUP_PROJECT_FAILED, { projectId: projectID, error })
    ),
    restoreProject: () => createAction(ProjectsActionTypes.RESTORE_PROJECT),
    restoreProjectSuccess: (projectID: number) => (
        createAction(ProjectsActionTypes.RESTORE_PROJECT_SUCCESS, { projectID })
    ),
    restoreProjectFailed: (error: any) => (
        createAction(ProjectsActionTypes.RESTORE_PROJECT_FAILED, { error })
    ),
};

export type ProjectActions = ActionUnion<typeof projectActions>;

export function getProjectTasksAsync(tasksQuery: Partial<TasksQuery> = {}): ThunkAction<void> {
    return (dispatch: ActionCreator<Dispatch>): void => {
        const store = getCVATStore();
        const state: CombinedState = store.getState();
        dispatch(projectActions.updateProjectsGettingQuery({}, tasksQuery));
        const query: Partial<TasksQuery> = {
            ...state.projects.tasksGettingQuery,
            page: 1,
            ...tasksQuery,
        };

        dispatch(getTasksAsync(query));
    };
}

export function getProjectsAsync(
    query: Partial<ProjectsQuery>, tasksQuery: Partial<TasksQuery> = {},
): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(projectActions.getProjects());
        dispatch(projectActions.updateProjectsGettingQuery(query, tasksQuery));

        // Clear query object from null fields
        const filteredQuery: Partial<ProjectsQuery> = {
            page: 1,
            ...query,
        };

        for (const key in filteredQuery) {
            if (filteredQuery[key] === null || typeof filteredQuery[key] === 'undefined') {
                delete filteredQuery[key];
            }
        }

        let result = null;
        try {
            result = await cvat.projects.get(filteredQuery);
        } catch (error) {
            dispatch(projectActions.getProjectsFailed(error));
            return;
        }

        const array = Array.from(result);

        const previewPromises = array.map((project): string => (project as any).preview().catch(() => ''));
        dispatch(projectActions.getProjectsSuccess(array, await Promise.all(previewPromises), result.count));

        // Appropriate tasks fetching proccess needs with retrieving only a single project
        if (Object.keys(filteredQuery).includes('id') && typeof filteredQuery.id === 'number') {
            dispatch(getProjectTasksAsync({
                ...tasksQuery,
                projectId: filteredQuery.id,
            }));
        }
    };
}

export function createProjectAsync(data: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const projectInstance = new cvat.classes.Project(data);

        dispatch(projectActions.createProject());
        try {
            const savedProject = await projectInstance.save();
            dispatch(projectActions.createProjectSuccess(savedProject.id));
        } catch (error) {
            dispatch(projectActions.createProjectFailed(error));
        }
    };
}

export function updateProjectAsync(projectInstance: any): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        try {
            const state = getState();
            dispatch(projectActions.updateProject());
            await projectInstance.save();
            const [project] = await cvat.projects.get({ id: projectInstance.id });
            dispatch(projectActions.updateProjectSuccess(project));
            dispatch(getProjectTasksAsync(state.projects.tasksGettingQuery));
        } catch (error) {
            let project = null;
            try {
                [project] = await cvat.projects.get({ id: projectInstance.id });
            } catch (fetchError) {
                dispatch(projectActions.updateProjectFailed(projectInstance, error));
                return;
            }
            dispatch(projectActions.updateProjectFailed(project, error));
        }
    };
}

export function deleteProjectAsync(projectInstance: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(projectActions.deleteProject(projectInstance.id));
        try {
            await projectInstance.delete();
            dispatch(projectActions.deleteProjectSuccess(projectInstance.id));
        } catch (error) {
            dispatch(projectActions.deleteProjectFailed(projectInstance.id, error));
        }
    };
}

export function restoreProjectAsync(file: File): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(projectActions.restoreProject());
        try {
            const projectInstance = await cvat.classes.Project.restore(file);
            dispatch(projectActions.restoreProjectSuccess(projectInstance));
        } catch (error) {
            dispatch(projectActions.restoreProjectFailed(error));
        }
    };
}

export function backupProjectAsync(projectInstance: any): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(projectActions.backupProject(projectInstance.id));

        try {
            const url = await projectInstance.backup();
            const downloadAnchor = window.document.getElementById('downloadAnchor') as HTMLAnchorElement;
            downloadAnchor.href = url;
            downloadAnchor.click();
            dispatch(projectActions.backupProjectSuccess(projectInstance.id));
        } catch (error) {
            dispatch(projectActions.backupProjectFailed(projectInstance.id, error));
        }
    };
}
