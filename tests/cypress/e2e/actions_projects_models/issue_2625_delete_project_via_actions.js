// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectDeleteSpec } from '../../support/const_project';

context('Delete a project via actions.', () => {
    const projectName = projectDeleteSpec.name;
    const issueID = 2625;

    before(() => {
        cy.prepareUserSession('/projects');
        cy.openProject(projectName);
    });
    after(() => {
        // restore deleted project
        cy.headlessCreateProject(projectDeleteSpec);
    });

    describe(`Testing "Issue ${issueID}"`, () => {
        it('Delete a project via actions.', () => {
            cy.deleteProjectViaActions(projectName);
        });
    });
});
