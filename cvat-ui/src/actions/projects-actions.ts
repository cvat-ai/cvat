// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction, Dispatch, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { ProjectsQuery, CombinedState } from 'reducers/interfaces';
import { getTasksSuccess, updateTaskSuccess } from 'actions/tasks-actions';
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
}

function updateProjectsGettingQuery(query: Partial<ProjectsQuery>): AnyAction {
    const action = {
        type: ProjectsActionTypes.UPDATE_PROJECTS_GETTING_QUERY,
        payload: {
            query,
        },
    };

    return action;
}

function getProjects(): AnyAction {
    const action = {
        type: ProjectsActionTypes.GET_PROJECTS,
        payload: {},
    };

    return action;
}

function getProjectsSuccess(array: any[], count: number): AnyAction {
    const action = {
        type: ProjectsActionTypes.GET_PROJECTS_SUCCESS,
        payload: {
            array,
            count,
        },
    };

    return action;
}

function getProjectsFailed(error: any): AnyAction {
    const action = {
        type: ProjectsActionTypes.GET_PROJECTS_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function getProjectsAsync(query: Partial<ProjectsQuery>):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(getProjects());
        dispatch(updateProjectsGettingQuery(query));

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
            dispatch(getProjectsFailed(error));
            return;
        }

        const array = Array.from(result);

        const tasks: any[] = [];
        const taskPreviewPromises: Promise<any>[] = [];

        for (const project of array) {
            taskPreviewPromises.push(...(project as any).tasks.map((task: any): string => {
                tasks.push(task);
                return (task as any).frames.preview().catch(() => '');
            }));
        }

        const taskPreviews = await Promise.all(taskPreviewPromises);

        dispatch(getProjectsSuccess(array, result.count));


        const store = getCVATStore();
        const state: CombinedState = store.getState();

        if (!state.tasks.fetching) {
            dispatch(getTasksSuccess(
                tasks,
                taskPreviews,
                tasks.length,
                {
                    page: 1,
                    assignee: null,
                    id: null,
                    mode: null,
                    name: null,
                    owner: null,
                    search: null,
                    status: null,
                }
            ));
        }
    };
}

function createProject(): AnyAction {
    const action = {
        type: ProjectsActionTypes.CREATE_PROJECT,
        payload: {},
    };

    return action;
}

function createProjectSuccess(projectId: number): AnyAction {
    const action = {
        type: ProjectsActionTypes.CREATE_PROJECT_SUCCESS,
        payload: {
            projectId,
        },
    };

    return action;
}

function createProjectFailed(error: any): AnyAction {
    const action = {
        type: ProjectsActionTypes.CREATE_PROJECT_FAILED,
        payload: {
            error,
        },
    };

    return action;
}

export function createProjectAsync(data: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        const projectInstance = new cvat.classes.Project(data);

        dispatch(createProject());
        try {
            const savedProject = await projectInstance.save();
            dispatch(createProjectSuccess(savedProject.id));
        } catch (error) {
            dispatch(createProjectFailed(error));
        }
    };
}

function updateProject(): AnyAction {
    const action = {
        type: ProjectsActionTypes.UPDATE_PROJECT,
        payload: {},
    };

    return action;
}

function updateProjectSuccess(project: any): AnyAction {
    const action = {
        type: ProjectsActionTypes.UPDATE_PROJECT_SUCCESS,
        payload: {
            project,
        },
    };

    return action;
}

function updateProjectFailed(project: any, error: any): AnyAction {
    const action = {
        type: ProjectsActionTypes.UPDATE_PROJECT_FAILED,
        payload: {
            error,
            project,
        },
    };

    return action;
}

export function updateProjectAsync(projectInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(updateProject());
            await projectInstance.save();
            const [project] = await cvat.projects.get({ id: projectInstance.id });
            dispatch(updateProjectSuccess(project));
            project.tasks.forEach((task: any) => {
                dispatch(updateTaskSuccess(task));
            });
        } catch (error) {
            let project = null;
            try {
                [project] = await cvat.projects.get({ id: projectInstance.id });
            } catch (fetchError) {
                dispatch(updateProjectFailed(projectInstance, error));
                return;
            }
            dispatch(updateProjectFailed(project, error));
        }
    };
}

function deleteProject(projectId: number): AnyAction {
    const action = {
        type: ProjectsActionTypes.DELETE_PROJECT,
        payload: {
            projectId,
        },
    };
    return action;
}

function deleteProjectSuccess(projectId: number): AnyAction {
    const action = {
        type: ProjectsActionTypes.DELETE_PROJECT_SUCCESS,
        payload: {
            projectId,
        },
    };
    return action;
}

function deleteProjectFailed(projectId: number, error: any): AnyAction {
    const action = {
        type: ProjectsActionTypes.DELETE_PROJECT_FAILED,
        payload: {
            projectId,
            error,
        },
    };
    return action;
}

export function deleteProjectAsync(projectInstance: any):
ThunkAction<Promise<void>, {}, {}, AnyAction> {
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        dispatch(deleteProject(projectInstance.id));
        try {
            await projectInstance.delete();
            dispatch(deleteProjectSuccess(projectInstance.id));
        } catch (error) {
            dispatch(deleteProjectFailed(projectInstance.id, error));
        }
    };
}
