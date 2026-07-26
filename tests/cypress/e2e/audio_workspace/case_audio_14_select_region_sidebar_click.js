// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName, secondLabelName } from '../../support/const_audio';

context('Audio annotation. Sidebar item click activates region.', () => {
    const caseId = 'audio_14';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
        cy.audioCreateRegionViaButton(firstLabelName, 80, 200);
        cy.audioCreateRegionViaButton(secondLabelName, 260, 360);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Click first item in regions list activates it and deactivates the second', () => {
            cy.get('.cvat-audio-region-item').should('have.length', 2);
            cy.get('.cvat-audio-region-item').first().click();
            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-audio-region-item').eq(1).should('not.have.class', 'cvat-audio-region-item-active');
        });
    });
});
