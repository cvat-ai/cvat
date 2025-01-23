// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    ActionUnion, createAction, ThunkAction, ThunkDispatch,
} from 'utils/redux';
import {
    ProjectsQuery, TasksQuery, CombinedState,
} from 'reducers';
import { getTasksAsync } from 'actions/tasks-actions';
import { getCVATStore } from 'cvat-store';
import { getCore } from 'cvat-core-wrapper';
import { filterNull } from 'utils/filter-null';

const cvat = getCore();

export enum ProjectsActionTypes {
    UPDATE_PROJECTS_GETTING_QUERY = 'UPDATE_PROJECTS_GETTING_QUERY',
    GET_PROJECTS = 'GET_PROJECTS',
    GET_PROJECTS_SUCCESS = 'GET_PROJECTS_SUCCESS',
    GET_PROJECTS_FAILED = 'GET_PROJECTS_FAILED',
    CREATE_PROJECT = 'CREATE_PROJECT',
    CREATE_PROJECT_SUCCESS = 'CREATE_PROJECT_SUCCESS',
    CREATE_PROJECT_FAILED = 'CREATE_PROJECT_FAILED',
    DELETE_PROJECT = 'DELETE_PROJECT',
    DELETE_PROJECT_SUCCESS = 'DELETE_PROJECT_SUCCESS',
    DELETE_PROJECT_FAILED = 'DELETE_PROJECT_FAILED',
    GET_PROJECT_PREVIEW = 'GET_PROJECT_PREVIEW',
    GET_PROJECT_PREVIEW_SUCCESS = 'GET_PROJECT_PREVIEW_SUCCESS',
    GET_PROJECT_PREVIEW_FAILED = 'GET_PROJECT_PREVIEW_FAILED',
}

const projectActions = {
    getProjects: (fetchingTimestamp: number) => createAction(ProjectsActionTypes.GET_PROJECTS, { fetchingTimestamp }),
    getProjectsSuccess: (array: any[], count: number) => (
        createAction(ProjectsActionTypes.GET_PROJECTS_SUCCESS, { array, count })
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
    deleteProject: (projectId: number) => createAction(ProjectsActionTypes.DELETE_PROJECT, { projectId }),
    deleteProjectSuccess: (projectId: number) => (
        createAction(ProjectsActionTypes.DELETE_PROJECT_SUCCESS, { projectId })
    ),
    deleteProjectFailed: (projectId: number, error: any) => (
        createAction(ProjectsActionTypes.DELETE_PROJECT_FAILED, { projectId, error })
    ),
    getProjectPreview: (projectID: number) => (
        createAction(ProjectsActionTypes.GET_PROJECT_PREVIEW, { projectID })
    ),
    getProjectPreviewSuccess: (projectID: number, preview: string) => (
        createAction(ProjectsActionTypes.GET_PROJECT_PREVIEW_SUCCESS, { projectID, preview })
    ),
    getProjectPreviewFailed: (projectID: number, error: any) => (
        createAction(ProjectsActionTypes.GET_PROJECT_PREVIEW_FAILED, { projectID, error })
    ),
};

export type ProjectActions = ActionUnion<typeof projectActions>;

export function getProjectTasksAsync(tasksQuery: Partial<TasksQuery> = {}): ThunkAction<void> {
    return (dispatch: ThunkDispatch, getState: () => CombinedState): void => {
        const store = getCVATStore();
        const state: CombinedState = store.getState();
        dispatch(projectActions.updateProjectsGettingQuery(
            getState().projects.gettingQuery,
            tasksQuery,
        ));
        const query: Partial<TasksQuery> = {
            ...state.projects.tasksGettingQuery,
            ...tasksQuery,
        };

        dispatch(getTasksAsync(query, false));
    };
}

export function getProjectsAsync(
    query: Partial<ProjectsQuery>, tasksQuery: Partial<TasksQuery> = {},
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const requestedOn = Date.now();
        const isRequestRelevant = (): boolean => (
            getState().projects.fetchingTimestamp === requestedOn
        );

        dispatch(projectActions.getProjects(requestedOn));
        dispatch(projectActions.updateProjectsGettingQuery(query, tasksQuery));

        // Clear query object from null fields
        const filteredQuery: Partial<ProjectsQuery> = filterNull({
            page: 1,
            ...query,
        });

        let result = null;
        try {
            result = await cvat.projects.get(filteredQuery);
        } catch (error) {
            if (isRequestRelevant()) {
                dispatch(projectActions.getProjectsFailed(error));
            }
            return;
        }

        if (isRequestRelevant()) {
            const array = Array.from(result);
            dispatch(projectActions.getProjectsSuccess(array, result.count));
            // Appropriate tasks fetching process needs with retrieving only a single project
            if (Object.keys(filteredQuery).includes('id') && typeof filteredQuery.id === 'number') {
                dispatch(getProjectTasksAsync({
                    ...tasksQuery,
                    projectId: filteredQuery.id,
                }));
            }
        }
    };
}

export function createProjectAsync(data: any): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const projectInstance = new cvat.classes.Project(data);

        dispatch(projectActions.createProject());
        try {
            const savedProject = await projectInstance.save();
            dispatch(projectActions.createProjectSuccess(savedProject.id));
            return savedProject;
        } catch (error) {
            dispatch(projectActions.createProjectFailed(error));
            throw error;
        }
    };
}

export function deleteProjectAsync(projectInstance: any): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        dispatch(projectActions.deleteProject(projectInstance.id));
        try {
            await projectInstance.delete();
            dispatch(projectActions.deleteProjectSuccess(projectInstance.id));
        } catch (error) {
            dispatch(projectActions.deleteProjectFailed(projectInstance.id, error));
        }
    };
}

export const getProjectsPreviewAsync = (project: any): ThunkAction => async (dispatch) => {
    dispatch(projectActions.getProjectPreview(project.id));
    try {
        const result = await project.preview();
        dispatch(projectActions.getProjectPreviewSuccess(project.id, result));
    } catch (error) {
        dispatch(projectActions.getProjectPreviewFailed(project.id, error));
    }
};
