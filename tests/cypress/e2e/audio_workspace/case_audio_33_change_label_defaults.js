// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, firstLabelName, secondLabelName, attrName,
} from '../../support/const_audio';

context('Audio annotation. Relabeling preserves compatible attributes.', () => {
    const caseId = 'audio_33';
    const customValue = 'custom value';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    after(() => {
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Preserves compatible attribute values when changing labels', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').first()
                .find('.cvat-audio-interval-header-index').click();
            cy.get('.cvat-audio-region-details').should('be.visible');
            cy.get('.cvat-audio-region-attr-name').should('contain.text', attrName);
            cy.get('.cvat-audio-region-details textarea').clear();
            cy.get('.cvat-audio-region-details textarea').type(customValue);
            cy.get('.cvat-audio-region-details textarea').should('have.value', customValue);

            cy.audioChangeSelectedRegionLabel(secondLabelName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', customValue);

            cy.audioChangeSelectedRegionLabel(firstLabelName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', customValue);
        });
    });
});
