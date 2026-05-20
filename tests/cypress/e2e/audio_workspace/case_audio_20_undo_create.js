// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Undo restores state after create.', () => {
    const caseId = 'audio_20';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('After create, Ctrl+Z removes the just-created region', () => {
            cy.get('body').then(($body) => {
                const initial = $body.find('.cvat-audio-region-item').length;
                cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
                cy.get('.cvat-audio-region-item').should('have.length', initial + 1);
                cy.audioUndo();
                cy.get('.cvat-audio-region-item').should('have.length', initial);
            });
        });
    });
});
