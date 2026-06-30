// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName as AUDIO_TASK_NAME,
    firstLabelName as AUDIO_FIRST_LABEL,
    secondLabelName as AUDIO_SECOND_LABEL,
    attrName as AUDIO_ATTR_NAME,
    attrDefaultValue as AUDIO_ATTR_DEFAULT,
    audioFile as AUDIO_FILE,
} from './const_audio';
import { defaultTaskSpec } from './default-specs';

const WAVEFORM_TIMEOUT = 30000;

Cypress.Commands.add('ensureAudioTask', () => {
    cy.window().its('cvat', { timeout: 25000 }).should('not.be.undefined');
    cy.window().then((win) => cy.wrap(win.cvat.tasks.get({ search: AUDIO_TASK_NAME }))).then((tasks) => {
        const existing = tasks.find((t) => t.name === AUDIO_TASK_NAME);
        if (existing) return;

        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName: AUDIO_TASK_NAME,
            labelName: AUDIO_FIRST_LABEL,
            attributes: [{ name: AUDIO_ATTR_NAME, values: AUDIO_ATTR_DEFAULT, type: 'text' }],
            serverFiles: [AUDIO_FILE],
        });
        taskSpec.labels.push({ name: AUDIO_SECOND_LABEL, attributes: [], type: 'any' });

        cy.intercept('POST', '/api/tasks**').as('createAudioTaskRequest');
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ jobIds }) => {
            cy.wait('@createAudioTaskRequest');
            const jobId = jobIds[0];
            cy.request({
                method: 'GET',
                url: `/api/jobs/${jobId}/data?quality=compressed&type=chunk&index=0`,
                auth: { username: Cypress.env('user'), password: Cypress.env('password') },
                timeout: 60000,
            }).its('status').should('eq', 200);
        });
    });
});

Cypress.Commands.add('assertWaveformReady', () => {
    cy.get('.cvat-audio-canvas-wrapper', { timeout: WAVEFORM_TIMEOUT }).should('exist');
    cy.get('.cvat-audio-placeholder').should('not.exist');
    cy.get('.cvat-audio-waveform-wrapper', { timeout: WAVEFORM_TIMEOUT })
        .should('exist')
        .and('not.have.css', 'visibility', 'hidden');
});

Cypress.Commands.add('openAudioJob', (taskName) => {
    cy.window().its('cvat', { timeout: 25000 }).should('not.be.undefined');
    cy.window().then((win) => cy.wrap(win.cvat.users.get({ self: true })))
        .its('0').should('not.be.undefined');
    cy.ensureAudioTask();
    cy.window().then((win) => cy.wrap(win.cvat.tasks.get({ search: taskName }))).then((tasks) => {
        const task = tasks.find((t) => t.name === taskName);
        if (!task) {
            throw new Error(`Audio task "${taskName}" not found after ensureAudioTask.`);
        }
        return cy.window().then((win) => cy.wrap(win.cvat.jobs.get({ taskID: task.id }))).then((jobs) => {
            const job = jobs.find((j) => j.type === 'annotation');
            if (!job) {
                throw new Error(`No annotation job for task "${taskName}"`);
            }
            cy.visit(`/tasks/${task.id}/jobs/${job.id}`);
        });
    });
    cy.get('.cvat-spinner').should('not.exist');
    cy.assertWaveformReady();
});

Cypress.Commands.add('audioActivateCreate', (labelName) => {
    cy.get('.cvat-audio-interval-region-control').click();
    cy.get('.cvat-audio-interval-region-popover-content', { timeout: 5000 }).should('be.visible');
    if (labelName) {
        cy.get('.cvat-audio-interval-region-popover-content .ant-select').click();
        cy.get('.ant-select-dropdown').filter(':visible').contains('.ant-select-item-option', labelName).click();
    }
    cy.get('.cvat-audio-interval-region-popover-content').contains('button', 'Draw').click();
    cy.get('.cvat-audio-interval-region-control').should('have.class', 'cvat-active-canvas-control');
});

Cypress.Commands.add('clickRegionOnWaveform', (x) => {
    cy.get('.cvat-audio-waveform-wrapper').first().then(($el) => {
        const yOffset = $el[0].getBoundingClientRect().height / 2;
        cy.get('.cvat-audio-waveform-wrapper').realMouseMove(x, yOffset);
        cy.get('.cvat-audio-waveform-wrapper').realMouseDown({
            position: { x, y: yOffset }, button: 'left',
        });
        cy.get('.cvat-audio-waveform-wrapper').realMouseUp({
            position: { x, y: yOffset }, button: 'left',
        });
    });
});

Cypress.Commands.add('audioDrawRegion', (xStart, xEnd) => {
    cy.get('.cvat-audio-waveform-wrapper').first().then(($el) => {
        const yOffset = $el[0].getBoundingClientRect().height / 2;
        cy.get('.cvat-audio-waveform-wrapper').realMouseDown({
            position: { x: xStart, y: yOffset }, button: 'left',
        });
        cy.get('.cvat-audio-waveform-wrapper').realMouseMove(xEnd, yOffset);
        cy.get('.cvat-audio-waveform-wrapper').realMouseUp({
            position: { x: xEnd, y: yOffset }, button: 'left',
        });
    });
});

Cypress.Commands.add('audioCreateRegionViaButton', (labelName, xStart, xEnd) => {
    cy.audioActivateCreate(labelName);
    cy.audioDrawRegion(xStart, xEnd);
    cy.get('.cvat-cursor-control').click();
    cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
});

Cypress.Commands.add('audioCreateRegionViaHotkey', (xStart, xEnd) => {
    cy.get('body').type('n');
    cy.get('.cvat-audio-interval-region-control').should('have.class', 'cvat-active-canvas-control');
    cy.audioDrawRegion(xStart, xEnd);
});

Cypress.Commands.add('audioExtendViaButton', (labelName) => {
    cy.get('.cvat-audio-interval-region-control').click();
    cy.get('.cvat-audio-interval-region-popover-content', { timeout: 5000 }).should('be.visible');
    if (labelName) {
        cy.get('.cvat-audio-interval-region-popover-content .ant-select').click();
        cy.get('.ant-select-dropdown').filter(':visible').contains('.ant-select-item-option', labelName).click();
    }
    cy.get('.cvat-audio-interval-region-popover-content').contains('button', 'Extend').click();
});

Cypress.Commands.add('audioExtendViaHotkey', () => {
    cy.get('body').type('{shift}E');
});

Cypress.Commands.add('audioOpenSlider', (controlClass) => {
    cy.get(`.${controlClass}`).click();
    cy.get('.cvat-audio-slider-popover-overlay', { timeout: 5000 }).should('exist').and('be.visible');
});

Cypress.Commands.add('audioSliderSetValue', (controlClass, arrowDirection, steps) => {
    cy.audioOpenSlider(controlClass);
    cy.get('.cvat-audio-slider-popover-overlay .ant-slider-handle').should('be.visible').focus();
    for (let i = 0; i < steps; i += 1) {
        cy.get('.cvat-audio-slider-popover-overlay .ant-slider-handle').type(arrowDirection);
    }
    cy.get('.cvat-audio-canvas-wrapper').click('topLeft', { force: true });
});

Cypress.Commands.add('audioSaveAnnotations', () => {
    cy.intercept('PATCH', '/api/jobs/**/annotations**').as('audioSaveRequest');
    cy.get('.cvat-annotation-header-save-button').click();
    cy.get('.cvat-annotation-header-save-button').should('contain.text', 'Save');
});

Cypress.Commands.add('audioUndo', () => {
    cy.get('body').type('{ctrl}z');
});
