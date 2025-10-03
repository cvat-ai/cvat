// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectNameDelete } from '../../support/const_project';

context('Delete a project via actions.', () => {
    const projectName = projectNameDelete;
    const issueID = 2625;

    before(() => {
        cy.loginSetupProjects();
        cy.openProject(projectName);
    });

    describe(`Testing "Issue ${issueID}"`, () => {
        it('Delete a project via actions.', () => {
            cy.deleteProjectViaActions(projectName);
        });
    });
});
