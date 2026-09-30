// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName, secondLabelName } from '../../support/const_audio';

context('Audio annotation. Overlapping regions are both stored.', () => {
    const caseId = 'audio_23';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Two regions with overlapping x-ranges coexist in the regions list', () => {
            cy.get('body').then(($body) => {
                const initial = $body.find('.cvat-audio-region-item').length;
                cy.audioCreateRegionViaButton(firstLabelName, 100, 280);
                cy.audioCreateRegionViaButton(secondLabelName, 200, 380);
                cy.get('.cvat-audio-region-item').should('have.length', initial + 2);
                cy.get('.cvat-audio-region-item').eq(initial).should('contain.text', firstLabelName);
                cy.get('.cvat-audio-region-item').last().should('contain.text', secondLabelName);
            });
        });
    });
});
