import { check } from 'k6';
import http from 'k6/http';

import { defaultTaskSpec } from '../../libs/default-specs.js';


export const options = {
    // duration: "20s",
    iterations: 1,
    vus: 1
}

const BASE_URL = 'http://localhost:8080/api/';
const ADMIN_EMAIL = 'admin@localhost.company';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '12qwaszx';

function login(email, username, password) {
    const response = http.post(BASE_URL + 'auth/login', JSON.stringify({
        username: username,
        email: email,
        password: password
    }),
        {
            headers: {
                'Content-Type': 'application/json',
            }
        })
    check(response, {
        'is status 200': (r) => r.status === 200,
    });
    return response.json().key;
}

function createTask(authKey) {
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        taskName: 'testTask',
        labelName: 'cat',
        labelType: 'rectangle'
    });
    const response = http.post(BASE_URL + 'tasks', JSON.stringify(taskSpec), {
        headers: {
            'Authorization': `Token ${authKey}`,
            'Content-Type': 'application/json',
        }
    })
    check(response, {
        'is status 201': (r) => r.status === 201,
    });
    return response.json().id
}

function getTask(authKey, taskId) {
    const response = http.get(BASE_URL + `tasks/${taskId}`, {
        headers: {
            'Authorization': `Token ${authKey}`,
            'Content-Type': 'application/json',
        }
    })
    check(response, {
        'is status 200': (r) => r.status === 200,
    });
    return response.json()
}

export function setup() {
    const token = login(ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD);
    const taskId = createTask(token);
    return { token: token, taskId: taskId }
}

export default function (data) {
    // const taskId = createTask(data.token);
    const taskData = getTask(data.token, data.taskId);
}