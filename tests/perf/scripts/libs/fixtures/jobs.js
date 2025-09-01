// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import APIJobs from '../api/jobs.js';

const stages = ['annotation', 'validation', 'acceptance'];
const states = ['new', 'in progress', 'completed', 'rejected'];
// const types = ['annotation', 'ground_truth', 'consensus_replica'];
const types = ['ground_truth'];
const frameMethods = ['random_uniform', 'random_per_job'];

/**
 * Utility: Create a random job payload
 * This builds a valid random request body according to the CVAT jobs API schema.
 *
 * @param {number} taskId - ID of an existing task
 * @param {number|null} assigneeId - ID of the user to assign the job to (or null)
 * @returns {Object} Randomized job payload
 */
export function createRandomJob(authToken, taskId, totalFrames, assigneeId = null) {
    const stage = randomItem(stages);
    const state = randomItem(states);
    const type = randomItem(types);
    const frameSelection = randomItem(frameMethods);

    const payload = {
        assignee: assigneeId,
        stage,
        state,
        type,
        task_id: taskId,
    };

    // Add frame selection–specific fields
    if (frameSelection === 'random_uniform') {
        payload.frame_selection_method = 'random_uniform';
        payload.frame_count = 1;
        payload.random_seed = randomIntBetween(0, 10000);
    } else if (frameSelection === 'random_per_job') {
        payload.frame_selection_method = 'random_per_job';
        payload.frames_per_job_count = 1;
        payload.random_seed = randomIntBetween(0, 10000);
    }

    return APIJobs.createJob(authToken, payload);
}

export default { createRandomJob };
