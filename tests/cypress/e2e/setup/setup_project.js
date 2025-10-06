// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    projectSpec,
    projectDeleteLabelSpec,
    projectDeleteSpec,
    project3d,
} from '../../support/const_project';

it('Prepare for testing projects', () => {
    cy.task('log', 'Seeding shared data');
    cy.visit('/auth/login');
    cy.headlessLogin();

    cy.intercept('POST', '/api/projects**').as('createProjectRequest');
    cy.headlessCreateProject(projectSpec);
    cy.wait('@createProjectRequest');
    cy.headlessCreateProject(project3d); // can't reuse for 3d if already has 2d tasks
    cy.wait('@createProjectRequest');
    cy.headlessCreateProject(projectDeleteLabelSpec); // label deletion tests require project to have only one label
    cy.wait('@createProjectRequest');

    // Tests that check project deletion
    cy.headlessCreateProject(projectDeleteSpec);
    cy.wait('@createProjectRequest');
});
