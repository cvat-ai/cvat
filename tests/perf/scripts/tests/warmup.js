// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import APITasks from '../libs/api/tasks.js';
import TasksLib from '../libs/fixtures/tasks.js';
import APIAuth from '../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../variables/constants.js';

const TOTAL_DURATION = "10s";

export const options = {
    scenarios: {
        get_task: {
            exec: 'TestGetTask',
            executor: 'constant-arrival-rate',
            duration: TOTAL_DURATION,
            rate: 3,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
        create_task: {
            exec: 'TestCreateTask',
            executor: 'constant-arrival-rate',
            duration: TOTAL_DURATION,
            rate: 3,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
        update_tasks: {
            exec: 'TestUpdateTask',
            executor: 'constant-arrival-rate',
            duration: TOTAL_DURATION,
            rate: 3,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
    },
};

function createTasks(token, count) {
    const createdTasks = [];
    for (let i = 0; i < count; i++) {
        const taskId = TasksLib.createRandomTask(token);
        createdTasks.push(taskId);
    }
    return createdTasks;
}

function getRandomTaskId(tasks) {
    return tasks[__VU % tasks.length]
}

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdTasks = createTasks(token, 30);
    return { token, tasksData: createdTasks };
}

export function TestGetTask (data) {
    APITasks.getTask(data.token, getRandomTaskId(data.tasksData));
}

export function TestCreateTask (data) {
    const taskId = TasksLib.createRandomTask(data.token);
    APITasks.deleteTask(data.token, taskId)
}

export function TestUpdateTask (data) {
    TasksLib.updateRandomTask(data.token, getRandomTaskId(data.tasksData))
}