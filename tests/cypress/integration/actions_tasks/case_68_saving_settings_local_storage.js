// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Saving setting to local storage.', () => {
    const caseId = '68';

    function testCheckedSettings(checked) {
        cy.openSettings();
        cy.contains('[role="tab"]', 'Workspace').click();
        for (const ws of [
            '.cvat-workspace-settings-show-interpolated',
            '.cvat-workspace-settings-show-text-always',
            '.cvat-workspace-settings-autoborders',
        ]) {
            checked
                ? cy.get(ws).find('[type="checkbox"]').should('be.checked')
                : cy.get(ws).find('[type="checkbox"]').should('not.be.checked').check().should('be.checked');
        }
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check some settings. Reload a page. The settings are saved.', () => {
            testCheckedSettings();
            cy.saveSettings();
            cy.get('.cvat-notification-notice-save-settings-success')
                .should('exist')
                .find('[data-icon="close"]')
                .click();
            cy.closeSettings();
            cy.reload();
            cy.closeModalUnsupportedPlatform(); // If the Firefox browser closes the modal window after reload
            testCheckedSettings(true);
        });
    });
});
