// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Minimap section is rendered.', () => {
    const caseId = 'audio_18';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Minimap container exists and has nested DOM nodes once waveform is ready', () => {
            cy.get('.cvat-audio-minimap-section').should('be.visible');
            cy.get('#minimap').should('exist');
            cy.get('#minimap').children().its('length').should('be.greaterThan', 0);
        });
    });
});
