// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import TasksLib from '../../libs/fixtures/tasks.js';
import JobsLib from '../../libs/fixtures/jobs.js';
import APIAuth from '../../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/constants.js';

const TOTAL_DURATION = '5s';

export const options = {
    scenarios: {
        createJobs: {
            exec: 'TestCreateGTJob',
            executor: 'constant-arrival-rate',
            duration: TOTAL_DURATION,
            rate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 100,
        },
    },
};

const IMAGE_PATH = '/data/images/image_1.jpg';
const SAMPLE_IMAGE_BINARY = open(IMAGE_PATH, 'b', IMAGE_PATH);
const DEFAULT_IMAGES_COUNT = 5;

function createTasks(token, count, imagesCount) {
    const createdTasks = [];
    for (let i = 0; i < count; i++) {
        const taskId = TasksLib.createRandomTask(token);
        TasksLib.addRandomData(token, taskId, SAMPLE_IMAGE_BINARY, imagesCount);
        createdTasks.push(taskId);
    }
    return createdTasks;
}

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdTasks = createTasks(token, 1, DEFAULT_IMAGES_COUNT);
    return { token, tasksData: createdTasks };
}

export function TestCreateGTJob(data) {
    const { token } = data;
    const taskID = TasksLib.createRandomTask(token);
    TasksLib.addRandomData(token, taskID, SAMPLE_IMAGE_BINARY, DEFAULT_IMAGES_COUNT);
    JobsLib.createRandomJob(token, taskID, DEFAULT_IMAGES_COUNT);
}
