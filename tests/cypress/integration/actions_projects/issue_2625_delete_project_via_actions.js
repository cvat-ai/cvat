// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName } from '../../support/const_project';

context('Delete a project via actions.', () => {
    const issueID = 2625;

    before(() => {
        cy.openProject(projectName);
    });

    describe(`Testing "Issue ${issueID}"`, () => {
        it('Delete a project via actions.', () => {
            cy.get('.cvat-project-top-bar-actions').trigger('mouseover');
            cy.get('.cvat-project-actions-menu').within(() => {
                cy.contains('[role="menuitem"]', 'Delete').click();
            });
            cy.get('.cvat-modal-confirm-remove-project').within(() => {
                cy.contains('button', 'Delete').click();
            });
            cy.contains('.cvat-projects-project-item-title', projectName).should('not.exist');
        });
    });
});
