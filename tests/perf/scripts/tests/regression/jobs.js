// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import TasksLib from '../../libs/fixtures/tasks.js';
import JobsLib from '../../libs/fixtures/jobs.js';
import APIAuth from '../../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/constants.js';

const TOTAL_DURATION = "1s";

export const options = {
    scenarios: {
        createJobs: {
            exec: 'TestCreateJobs',
            executor: 'constant-arrival-rate',
            // How long the test lasts
            duration: TOTAL_DURATION,
            // How many iterations per timeUnit
            rate: 15,
            // Start `rate` iterations per second
            timeUnit: '1s',
            // Pre-allocate 2 VUs before starting the test
            preAllocatedVUs: 10,
            // Spin up a maximum of 50 VUs to sustain the defined
            // constant arrival rate.
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

export function TestCreateJobs(data) {
    JobsLib.createRandomJob(data.token, getRandomTaskId(data.tasksData))
}
