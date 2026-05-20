// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Delete region via sidebar context menu.', () => {
    const caseId = 'audio_09';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Open region item menu and click Remove removes the region', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').should('have.length', 1);
            cy.get('.cvat-audio-region-item').first()
                .find('.cvat-audio-region-item-action-btn').last().click();
            cy.get('.cvat-audio-region-item-menu', { timeout: 5000 }).should('be.visible');
            cy.get('.cvat-audio-region-item-menu').contains(/remove/i).click();
            cy.get('.cvat-audio-region-item').should('have.length', 0);
        });
    });
});
