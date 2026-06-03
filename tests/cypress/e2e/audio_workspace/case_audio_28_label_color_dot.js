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
        it('Audio popovers render a color indicator next to the selected label and in dropdown options', () => {
            cy.get('.cvat-audio-interval-region-control').click();
            cy.get('.cvat-audio-interval-region-popover-content .cvat-label-color-dot', { timeout: 5000 })
                .should('be.visible');

            cy.get('.cvat-audio-interval-region-popover-content .ant-select').click();
            cy.get('.ant-select-dropdown:visible').should('exist');
            cy.get('.ant-select-dropdown:visible .ant-select-item-option').then(($options) => {
                cy.get('.ant-select-dropdown:visible .ant-select-item-option .cvat-label-color-dot')
                    .should('have.length', $options.length);
            });
        });
    });
});
