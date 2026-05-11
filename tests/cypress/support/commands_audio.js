// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const WAVEFORM_TIMEOUT = 30000;

Cypress.Commands.add('assertWaveformReady', () => {
    cy.get('.cvat-audio-canvas-wrapper', { timeout: WAVEFORM_TIMEOUT }).should('exist');
    cy.get('.cvat-audio-placeholder').should('not.exist');
    cy.get('.cvat-audio-waveform-wrapper', { timeout: WAVEFORM_TIMEOUT })
        .should('exist')
        .and('not.have.css', 'visibility', 'hidden');
    cy.get('.cvat-audio-waveform-wrapper canvas', { timeout: WAVEFORM_TIMEOUT }).should('exist');
});

Cypress.Commands.add('openAudioJob', (taskName, removeAnnotations = true) => {
    cy.openTaskJob(taskName, 0, removeAnnotations);
    cy.assertWaveformReady();
});

Cypress.Commands.add('audioActivateCreate', (labelName) => {
    cy.get('.cvat-audio-create-region-control').click();
    cy.get('.cvat-audio-create-region-popover-content', { timeout: 5000 }).should('be.visible');
    if (labelName) {
        cy.get('.cvat-audio-create-region-popover-content .ant-select').click();
        cy.get('.ant-select-dropdown:visible').contains('.ant-select-item-option', labelName).click();
    }
    cy.get('.cvat-audio-create-region-popover-content').contains('button', 'Create').click();
    cy.get('.cvat-audio-create-region-control').should('have.class', 'cvat-active-canvas-control');
});

Cypress.Commands.add('audioDrawRegion', (xStart, xEnd) => {
    cy.get('.cvat-audio-waveform-wrapper canvas').first().then(($canvas) => {
        const rect = $canvas[0].getBoundingClientRect();
        const yMid = rect.top + rect.height / 2;
        cy.wrap($canvas).trigger('mousedown', {
            clientX: rect.left + xStart, clientY: yMid, button: 0, force: true,
        });
        cy.wrap($canvas).trigger('mousemove', {
            clientX: rect.left + xEnd, clientY: yMid, force: true,
        });
        cy.wrap($canvas).trigger('mouseup', {
            clientX: rect.left + xEnd, clientY: yMid, force: true,
        });
    });
});

Cypress.Commands.add('audioCreateRegionViaButton', (labelName, xStart, xEnd) => {
    cy.audioActivateCreate(labelName);
    cy.audioDrawRegion(xStart, xEnd);
});

Cypress.Commands.add('audioCreateRegionViaHotkey', (xStart, xEnd) => {
    cy.get('body').type('n');
    cy.get('.cvat-audio-create-region-control').should('have.class', 'cvat-active-canvas-control');
    cy.audioDrawRegion(xStart, xEnd);
});

Cypress.Commands.add('audioOpenSlider', (controlClass) => {
    cy.get(`.${controlClass}`).click();
    cy.get('.cvat-audio-slider-popover-overlay:visible', { timeout: 5000 }).should('exist');
});

Cypress.Commands.add('audioSliderSetValue', (controlClass, arrowDirection, steps) => {
    cy.audioOpenSlider(controlClass);
    cy.get('.cvat-audio-slider-popover-overlay:visible .ant-slider-handle').focus();
    for (let i = 0; i < steps; i += 1) {
        cy.get('.cvat-audio-slider-popover-overlay:visible .ant-slider-handle').type(arrowDirection);
    }
    // close popover by clicking elsewhere
    cy.get('.cvat-audio-canvas-wrapper').click('topLeft', { force: true });
});

Cypress.Commands.add('audioSaveAnnotations', () => {
    cy.intercept('PATCH', '/api/jobs/**/annotations**').as('audioSaveRequest');
    cy.get('.cvat-annotation-header-save-button').click();
    cy.get('.cvat-annotation-header-save-button', { timeout: 30000 }).should('contain.text', 'Save');
});

Cypress.Commands.add('audioUndo', () => {
    cy.get('body').type('{ctrl}z');
});
