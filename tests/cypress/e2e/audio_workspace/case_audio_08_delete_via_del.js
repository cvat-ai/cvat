// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Delete region via Del key.', () => {
    const caseId = 'audio_08';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Select region in sidebar list and press Del removes it', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').should('have.length', 1).first().click();
            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('body').type('{del}');
            cy.get('.cvat-audio-region-item').should('have.length', 0);
        });
    });
});
