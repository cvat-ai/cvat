// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Label selector shows color dot in audio popovers.', () => {
    const caseId = 'audio_28';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        // Both checks live in a single `it`: with testIsolation:true Cypress
        // resets the browser session between tests, and `before()` only runs
        // once per context, so the second test would hit about:blank.
        it('Audio popovers render a color indicator next to the selected label and in dropdown options', () => {
            // Antd Popover uses controlled `open`; clicking another control fires
            // onOpenChange(false) on the previous popover, so we don't need
            // explicit cleanup between assertions.
            cy.get('.cvat-audio-create-region-control').click();
            cy.get('.cvat-audio-create-region-popover-content .cvat-label-color-dot', { timeout: 5000 })
                .should('be.visible');

            cy.get('.cvat-audio-record-region-control').click();
            cy.get('.cvat-audio-record-region-popover-content .cvat-label-color-dot', { timeout: 5000 })
                .should('be.visible');

            cy.get('.cvat-audio-extend-region-control').click();
            cy.get('.cvat-audio-extend-region-popover-content .cvat-label-color-dot', { timeout: 5000 })
                .should('be.visible');

            // Open the Create popover's Select dropdown — should show one dot per label option.
            cy.get('.cvat-audio-create-region-control').click();
            cy.get('.cvat-audio-create-region-popover-content', { timeout: 5000 }).should('be.visible');
            cy.get('.cvat-audio-create-region-popover-content .ant-select').click();
            cy.get('.ant-select-dropdown:visible').should('exist');
            cy.get('.ant-select-dropdown:visible .ant-select-item-option').then(($options) => {
                cy.get('.ant-select-dropdown:visible .ant-select-item-option .cvat-label-color-dot')
                    .should('have.length', $options.length);
            });
        });
    });
});
