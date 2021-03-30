// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Saving setting to local storage.', () => {
    const caseId = '68';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check some default settings.', () => {
            cy.openSettings();
            cy.contains('[role="tab"]', 'Workspace').click();
            for (const ws of [
                '.cvat-workspace-settings-show-interpolated',
                '.cvat-workspace-settings-show-text-always',
                '.cvat-workspace-settings-autoborders',
            ]) {
                cy.get(ws).find('[type="checkbox"]').should('not.be.checked').check().should('be.checked');
            }
            cy.closeSettings();
        });
    });
});
