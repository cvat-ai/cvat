// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Waveform renders.', () => {
    const caseId = 'audio_02';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Waveform and minimap are rendered, placeholder is gone', () => {
            cy.get('.cvat-audio-placeholder').should('not.exist');
            cy.get('.cvat-audio-waveform-wrapper').should('be.visible');
            cy.get('.cvat-audio-minimap-section').should('be.visible');
            cy.get('#minimap').should('exist');
        });
    });
});
