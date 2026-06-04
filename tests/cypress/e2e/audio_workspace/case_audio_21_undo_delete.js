// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Undo restores deleted region.', () => {
    const caseId = 'audio_21';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('After delete, Ctrl+Z brings the region back', () => {
            cy.get('body').then(($body) => {
                const initial = $body.find('.cvat-audio-region-item').length;
                cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
                cy.get('.cvat-audio-region-item').should('have.length', initial + 1);
                cy.get('.cvat-audio-region-item').last().click();
                cy.get('body').type('{del}');
                cy.get('.cvat-audio-region-item').should('have.length', initial);
                cy.audioUndo();
                cy.get('.cvat-audio-region-item').should('have.length', initial + 1);
            });
        });
    });
});
