// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName,
    firstLabelName,
    secondLabelName,
    attrName,
    attrDefaultValue,
    audioFile,
} from '../../support/const_audio';
import { defaultTaskSpec } from '../../support/default-specs';

it('Prepare for testing audio workspace', () => {
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        taskName,
        labelName: firstLabelName,
        attributes: [{ name: attrName, values: attrDefaultValue, type: 'text' }],
        serverFiles: [audioFile],
    });
    taskSpec.labels.push({ name: secondLabelName, attributes: [], type: 'any' });

    cy.visit('/auth/login');
    cy.headlessLogin();
    cy.intercept('POST', '/api/tasks**').as('createAudioTaskRequest');
    cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ jobIDs }) => {
        cy.wait('@createAudioTaskRequest');
        // Prime audio chunk preparation on the server side. The first chunk
        // request triggers expensive on-disk transcoding/caching; without
        // this priming step the WaveSurfer wrapper can take >90s to appear
        // the first time a test opens the job. failOnStatusCode: false so a
        // 429 or transient error does not abort setup — we only need to
        // kick the server into pre-warming the chunk.
        const jobID = jobIDs[0];
        cy.request({
            method: 'GET',
            url: `/api/jobs/${jobID}/data?quality=compressed&type=chunk&index=0`,
            auth: { username: Cypress.env('user'), password: Cypress.env('password') },
            timeout: 120000,
            failOnStatusCode: false,
        });
    });
});
