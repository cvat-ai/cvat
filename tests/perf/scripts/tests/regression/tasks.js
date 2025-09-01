// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import APITasks from '../../libs/api/tasks.js';
import TasksLib from '../../libs/fixtures/tasks.js';
import APIAuth from '../../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/constants.js';

const TOTAL_DURATION = '1s';

export const options = {
    scenarios: {
        get_task: {
            exec: 'TestGetTasks',
            executor: 'constant-arrival-rate',
            // How long the test lasts
            duration: TOTAL_DURATION,
            // How many iterations per timeUnit
            rate: 5,
            // Start `rate` iterations per second
            timeUnit: '1s',
            // Pre-allocate 2 VUs before starting the test
            preAllocatedVUs: 10,
            // Spin up a maximum of 50 VUs to sustain the defined
            // constant arrival rate.
            maxVUs: 100,
        },
        // create_task: {
        //     exec: 'TestCreateTask',
        //     executor: 'constant-arrival-rate',
        //     duration: TOTAL_DURATION,
        //     rate: 5,
        //     timeUnit: '1s',
        //     preAllocatedVUs: 10,
        //     maxVUs: 100,
        // },
        // update_tasks: {
        //     exec: 'TestUpdateTask',
        //     executor: 'constant-arrival-rate',
        //     duration: TOTAL_DURATION,
        //     rate: 5,
        //     timeUnit: '1s',
        //     preAllocatedVUs: 10,
        //     maxVUs: 100,
        // },
    },
};

const imagePath = '/data/images/image_1.jpg';
const sampleImageBinary = open(imagePath, 'b', imagePath);

function createTasks(token, count) {
    const createdTasks = [];
    for (let i = 0; i < count; i++) {
        const taskId = TasksLib.createRandomTask(token);
        TasksLib.addRandomData(token, taskId, sampleImageBinary, 5);
        createdTasks.push(taskId);
    }
    return createdTasks;
}

function getRandomTaskId(tasks) {
    return tasks[__VU % tasks.length];
}

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdTasks = createTasks(token, 1);
    return { token, tasksData: createdTasks };
}

export function TestGetTasks(data) {
    APITasks.getTask(data.token, getRandomTaskId(data.tasksData));
    APITasks.getTasks(data.token);
}

export function TestCreateTask(data) {
    const { token } = data;
    const taskId = TasksLib.createRandomTask(token);
    TasksLib.addRandomData(token, taskId, sampleImageBinary, 3);
    APITasks.deleteTask(token, taskId);
}

export function TestUpdateTask(data) {
    TasksLib.updateRandomTask(data.token, getRandomTaskId(data.tasksData));
}
