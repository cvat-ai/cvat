// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import APITasks from '../../libs/api/tasks.js';
import APITus from '../../libs/api/tus.js';
import { randomBool } from '../../utils/random.js'
import { randomIntBetween, randomString, randomItem } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BUG_TRACKER_FAKE_URL = "https://jira.example.com/browse/PROJ-123"
const LABEL_TYPES = ['rectangle', 'polygon', 'polyline', 'points', 'cuboid'];

function createRandomTask(authKey, projectId, ownerId) {
    const overlapChoices = [0, 2, 5, 10];
    const taskSpec = {
        name: `task_${randomString(8)}`,
        projectId: projectId,
        ownerId: ownerId,
        labels: [
            {
                name: `label_${randomString(5)}`,
                type: randomItem(LABEL_TYPES),
                attributes: [
                    {
                        name: 'occluded',
                        mutable: true,
                        input_type: 'select',
                        default_value: 'false',
                        values: ['true', 'false'],
                    },
                    {
                        name: 'quality',
                        mutable: true,
                        input_type: 'select',
                        default_value: 'high',
                        values: ['low', 'medium', 'high'],
                    }
                ]
            }
        ],
        overlap: randomItem(overlapChoices),
        segment_size: randomIntBetween(10, 50),
        bug_tracker: BUG_TRACKER_FAKE_URL,
        target_storage: {
            location: "local"
        },
        source_storage: {
            location: "local"
        },
        subset: randomString(10),
    };

    return APITasks.createTask(authKey, taskSpec)
}

export function updateRandomTask(authKey, taskId, projectId, assigneeId) {
    const possibleUpdates = {
        name: `updated_${randomString(8)}`,
        assignee_id: assigneeId,
        project_id: projectId,
        bug_tracker: randomBool()
            ? `http://bugs.example.com/${randomIntBetween(100, 999)}`
            : undefined,
        labels: randomBool()
            ? [
                {
                    name: `label_${randomString(5)}`,
                    type: randomItem(LABEL_TYPES),
                    attributes: [],
                },
            ]
            : undefined,
        subset: randomString(10),
    };

    // clean up undefined, to not pass empty fields
    const filteredUpdates = {};
    for (const [key, value] of Object.entries(possibleUpdates)) {
        if (value !== undefined) {
            filteredUpdates[key] = value;
        }
    }
    return APITasks.patchTask(authKey, taskId, filteredUpdates);
}

function addRandomData(authKey, taskId, binaryData, filesCount) {
    let filesData = [];
    for (var i = 0; i < filesCount; i++) {
        filesData[i] = { name: randomString(10), bytes: binaryData }
    }
    APITus.tusUploadFiles(authKey, taskId, filesData, { image_quality: 70 })
}


export default { createRandomTask, updateRandomTask, addRandomData }