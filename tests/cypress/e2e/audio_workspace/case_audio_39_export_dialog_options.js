// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Export annotations.', () => {
    const caseId = 'audio_39';

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export job dataset successfully exports annotations', () => {
            cy.interactMenu('Export job dataset');

            // non-applicable 2D options are hidden
            cy.get('.cvat-modal-export-job').should('be.visible').within(() => {
                cy.get('.cvat-modal-export-save-images').should('not.exist');
                cy.contains('Save images').should('not.exist');
            });

            cy.get('.cvat-modal-export-job').find('.cvat-modal-export-select').click();
            cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').within(() => {
                cy.get('.cvat-modal-export-option-item').should('have.length', 1).click();
            });
            cy.get('.cvat-modal-export-job').contains('button', 'OK').click();

            cy.get('.cvat-modal-export-job').should('not.exist');
            cy.get('.cvat-notification-notice-export-job-start').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-export-job-start');
            cy.get('.cvat-notification-notice-export-job-finished', { timeout: 60000 })
                .should('be.visible')
                .and('contain.text', 'Export is finished');
            cy.closeNotification('.cvat-notification-notice-export-job-finished');
        });
    });
});
