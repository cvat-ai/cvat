// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. DIMENSION_1D opens Audio workspace by default.', () => {
    const caseId = 'audio_22';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Opening a 1D-task job lands in audio workspace', () => {
            cy.get('.cvat-audio-workspace').should('exist');
            cy.get('.cvat-audio-interval-region-control').should('exist');
            cy.get('.cvat-audio-edit-region-control').should('exist');
            cy.get('.cvat-audio-interval-region-control').click();
            cy.get('.cvat-audio-interval-region-popover-content', { timeout: 5000 }).should('be.visible');
            cy.get('.cvat-audio-interval-region-popover-content').contains('button', 'Draw').should('exist');
            cy.get('.cvat-audio-interval-region-popover-content').contains('button', 'Record').should('exist');
            cy.get('.cvat-audio-interval-region-popover-content').contains('button', 'Extend').should('exist');
        });
    });
});
