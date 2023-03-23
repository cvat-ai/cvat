// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Saving setting to local storage.', () => {
    const caseId = '68';

    function setupAndSaveSettings(check) {
        cy.openSettings();
        const method = check ? 'check' : 'uncheck';
        cy.contains('[role="tab"]', 'Player').click();
        cy.get('.cvat-player-settings-reset-zoom').find('[type="checkbox"]')[method]();
        cy.contains('[role="tab"]', 'Workspace').click();
        cy.get('.cvat-workspace-settings-show-interpolated').find('[type="checkbox"]')[method]();
        cy.get('.cvat-workspace-settings-show-text-always').find('[type="checkbox"]')[method]();
        cy.get('.cvat-workspace-settings-autoborders').find('[type="checkbox"]')[method]();
        cy.saveSettings();
        cy.get('.cvat-notification-notice-save-settings-success')
            .should('exist')
            .find('[data-icon="close"]')
            .click();
    }

    function testCheckedSettings(checked = false) {
        cy.openSettings();
        cy.contains('[role="tab"]', 'Player').click();
        for (const ws of [
            '.cvat-player-settings-reset-zoom',
        ]) {
            if (checked) {
                cy.get(ws).find('[type="checkbox"]').should('be.checked');
            } else {
                cy.get(ws).find('[type="checkbox"]').should('not.be.checked');
            }
        }

        cy.contains('[role="tab"]', 'Workspace').click();
        for (const ws of [
            '.cvat-workspace-settings-show-interpolated',
            '.cvat-workspace-settings-show-text-always',
            '.cvat-workspace-settings-autoborders',
        ]) {
            if (checked) {
                cy.get(ws).find('[type="checkbox"]').should('be.checked');
            } else {
                cy.get(ws).find('[type="checkbox"]').should('not.be.checked');
            }
        }

        cy.closeSettings();
    }

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check some settings. Reload a page. The settings are saved.', () => {
            setupAndSaveSettings(true);
            cy.reload();
            testCheckedSettings(true);
            setupAndSaveSettings(false);
            cy.reload();
            testCheckedSettings(false);
        });
    });
});
