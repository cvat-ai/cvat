// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import tasks from '../libs/api/tasks.js';
import APIAuth from '../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../variables/constants.js';

export const options = {
    scenarios: {
        contacts: {
            executor: 'constant-arrival-rate',
            duration: '20s',
            rate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 2,
            maxVUs: 5,
        },
    },
};

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdTasks = [];
    for (let i = 0; i < 30; i++) {
        const taskId = tasks.createTask(token);
        createdTasks.push(taskId);
    }
    return { token, tasksData: createdTasks };
}

export default function (data) {
    const randomTask = data.tasksData[__VU % data.tasksData.length];
    // eslint-disable-next-line no-unused-vars
    const taskData = tasks.getTask(data.token, randomTask);
}
