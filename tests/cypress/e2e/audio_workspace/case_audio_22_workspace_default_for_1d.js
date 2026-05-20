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
            cy.get('.cvat-audio-create-region-control').should('exist');
            cy.get('.cvat-audio-record-region-control').should('exist');
            cy.get('.cvat-audio-edit-region-control').should('exist');
        });
    });
});
