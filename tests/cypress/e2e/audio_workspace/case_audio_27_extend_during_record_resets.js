// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Extend during Record cancels record without creating an extend region.', () => {
    const caseId = 'audio_27';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Shift+E pressed while recording switches mode back to cursor and adds no new region', () => {
            cy.get('body').then(($body) => {
                const initial = $body.find('.cvat-audio-region-item').length;
                cy.audioCreateRegionViaButton(firstLabelName, 100, 250);
                const baseline = initial + 1;
                cy.get('.cvat-audio-region-item').should('have.length', baseline);

                cy.get('body').type('{shift}N');
                cy.get('.cvat-audio-interval-region-control')
                    .should('have.class', 'cvat-active-canvas-control');

                cy.get('.cvat-cursor-control').click();
                cy.get('.cvat-cursor-control')
                    .should('have.class', 'cvat-active-canvas-control');

                cy.get('body').type('{shift}E');
                cy.get('.cvat-cursor-control')
                    .should('have.class', 'cvat-active-canvas-control');

                cy.get('.cvat-audio-interval-region-control')
                    .should('not.have.class', 'cvat-active-canvas-control');
                cy.get('.cvat-audio-interval-region-popover-content').should('not.be.visible');
                cy.get('.cvat-audio-region-item').should('have.length', baseline);
            });
        });
    });
});
