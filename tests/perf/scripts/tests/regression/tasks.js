import APITasks from '../../libs/api/tasks.js';
import APIAuth from '../../libs/api/auth.js';
import { ADMIN_PASSWORD, ADMIN_USERNAME } from '../../variables/variables.js';


export const options = {
  scenarios: {
    contacts: {
      executor: 'constant-arrival-rate',
      // How long the test lasts
      duration: '3m',
      // How many iterations per timeUnit
      rate: 10,
      // Start `rate` iterations per second
      timeUnit: '1s',
      // Pre-allocate 2 VUs before starting the test
      preAllocatedVUs: 2,
      // Spin up a maximum of 50 VUs to sustain the defined
      // constant arrival rate.
      maxVUs: 10,
    },
  },
};

function createTasks(token, count) {
    const createdTasks = [];
    for (let i = 0; i < count; i++) {
        let taskId = APITasks.createTask(token);
        createdTasks.push(taskId);
    }
    return createdTasks;
}

export function setup() {
    const token = APIAuth.login(ADMIN_USERNAME, ADMIN_PASSWORD);
    const createdTasks = createTasks(token, 30);
    return { token: token, tasksData: createdTasks }
}

export default function (data) {
    const randomTask = data.tasksData[data.tasksData.length % __VU]
    const taskData = APITasks.getTask(data.token, randomTask);
}
