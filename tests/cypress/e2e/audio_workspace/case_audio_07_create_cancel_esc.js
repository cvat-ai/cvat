// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. ESC cancels region creation.', () => {
    const caseId = 'audio_07';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Activate create mode, press ESC, no region added and cursor mode is restored', () => {
            cy.get('.cvat-audio-region-item').should('have.length', 0);
            cy.audioActivateCreate(firstLabelName);
            cy.get('.cvat-audio-interval-region-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('body').type('{esc}');
            cy.get('.cvat-audio-interval-region-control').should('not.have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-audio-region-item').should('have.length', 0);
        });
    });
});
