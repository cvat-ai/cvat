// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, firstLabelName, secondLabelName, attrName, attrDefaultValue, secondAttrDefaultValue,
} from '../../support/const_audio';

context('Audio annotation. Relabeling restores label defaults.', () => {
    const caseId = 'audio_33';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    after(() => {
        cy.audioClearAnnotationsAndSave();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Drops old attributes and restores defaults when changing labels', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
            cy.get('.cvat-audio-region-item').first().click();
            cy.get('.cvat-audio-region-details').should('be.visible');
            cy.get('.cvat-audio-region-attr-name').should('contain.text', attrName);
            cy.get('.cvat-audio-region-details textarea').clear();
            cy.get('.cvat-audio-region-details textarea').type('custom value');
            cy.get('.cvat-audio-region-details textarea').should('have.value', 'custom value');

            cy.audioChangeSelectedRegionLabel(secondLabelName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', secondAttrDefaultValue);

            cy.audioChangeSelectedRegionLabel(firstLabelName);
            cy.get('.cvat-audio-region-details textarea').should('have.value', attrDefaultValue);
        });
    });
});
