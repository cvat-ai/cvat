// Copyright (C) 2019-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { Dispatch, ActionCreator } from 'redux';

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import { ProjectsQuery } from 'reducers/interfaces';
import { getTasksSuccess, updateTaskSuccess } from 'actions/tasks-actions';
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

// prettier-ignore
const projectActions = {
    getProjects: () => createAction(ProjectsActionTypes.GET_PROJECTS),
    getProjectsSuccess: (array: any[], previews: string[], count: number) => (
        createAction(ProjectsActionTypes.GET_PROJECTS_SUCCESS, { array, previews, count })
    ),
    getProjectsFailed: (error: any) => createAction(ProjectsActionTypes.GET_PROJECTS_FAILED, { error }),
    updateProjectsGettingQuery: (query: Partial<ProjectsQuery>) => (
        createAction(ProjectsActionTypes.UPDATE_PROJECTS_GETTING_QUERY, { query })
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
};

export type ProjectActions = ActionUnion<typeof projectActions>;

export function getProjectsAsync(query: Partial<ProjectsQuery>): ThunkAction {
    return async (dispatch: ActionCreator<Dispatch>, getState): Promise<void> => {
        dispatch(projectActions.getProjects());
        dispatch(projectActions.updateProjectsGettingQuery(query));

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

        // Appropriate tasks fetching proccess needs with retrieving only a single project
        if (Object.keys(filteredQuery).includes('id')) {
            const tasks: any[] = [];
            const [project] = array;
            const taskPreviewPromises: Promise<string>[] = (project as any).tasks.map((task: any): string => {
                tasks.push(task);
                return (task as any).frames.preview().catch(() => '');
            });

            const taskPreviews = await Promise.all(taskPreviewPromises);

            const state = getState();

            dispatch(projectActions.getProjectsSuccess(array, taskPreviews, result.count));

            if (!state.tasks.fetching) {
                dispatch(
                    getTasksSuccess(tasks, taskPreviews, tasks.length, {
                        page: 1,
                        assignee: null,
                        id: null,
                        mode: null,
                        name: null,
                        owner: null,
                        search: null,
                        status: null,
                    }),
                );
            }
        } else {
            const previewPromises = array.map((project): string => (project as any).preview().catch(() => ''));
            dispatch(projectActions.getProjectsSuccess(array, await Promise.all(previewPromises), result.count));
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
    return async (dispatch: ActionCreator<Dispatch>): Promise<void> => {
        try {
            dispatch(projectActions.updateProject());
            await projectInstance.save();
            const [project] = await cvat.projects.get({ id: projectInstance.id });
            // TODO: Check case when a project is not available anymore after update
            // (assignee changes assignee and project is not public)
            dispatch(projectActions.updateProjectSuccess(project));
            project.tasks.forEach((task: any) => {
                dispatch(updateTaskSuccess(task, task.id));
            });
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
