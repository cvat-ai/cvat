// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Workspace layout.', () => {
    const caseId = 'audio_01';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Three workspace zones are visible', () => {
            cy.get('.cvat-audio-workspace').should('exist');
            cy.get('.cvat-canvas-controls-sidebar').should('be.visible');
            cy.get('.cvat-audio-canvas-wrapper').should('be.visible');
            cy.get('.cvat-objects-sidebar').should('be.visible');
        });
    });
});
