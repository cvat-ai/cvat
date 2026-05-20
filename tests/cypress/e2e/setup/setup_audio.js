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
    cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ jobIds }) => {
        cy.wait('@createAudioTaskRequest');
        const jobId = jobIds[0];
        cy.request({
            method: 'GET',
            url: `/api/jobs/${jobId}/data?quality=compressed&type=chunk&index=0`,
            auth: { username: Cypress.env('user'), password: Cypress.env('password') },
            timeout: 120000,
            failOnStatusCode: false,
        });
    });
});
