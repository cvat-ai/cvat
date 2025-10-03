// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    projectName, projectName3d, projectNameDelete,
    labelName,
    attrName,
    textDefaultValue,
    multiAttrParams,
    labelDelete,
    projectNameDeleteLabel,
} from '../../support/const_project';

it('Prepare for testing projects', () => {
    cy.task('log', 'Seeding shared data');
    cy.visit('/auth/login');
    cy.headlessLogin();
    const projectSpec = {
        name: projectName,
        labels: [
            {
                name: labelName,
                type: 'any',
                attributes: [
                    {
                        name: multiAttrParams.name,
                        default_value: textDefaultValue,
                        values: [multiAttrParams.values],
                        input_type: multiAttrParams.type,
                        mutable: false,
                    },
                    {
                        mutable: false,
                        name: attrName,
                        values: [],
                        default_value: textDefaultValue,
                        input_type: 'text',
                    },
                ],
            },
        ],
    };
    const projectDeleteLabelSpec = {
        name: projectNameDeleteLabel,
        labels: [
            labelDelete,
        ],
    };
    const projectDeleteSpec = {
        ...projectSpec,
        name: projectNameDelete,
    };
    cy.intercept('POST', '/api/projects**').as('createProjectRequest');
    cy.headlessCreateProject(projectSpec);
    cy.wait('@createProjectRequest');
    cy.headlessCreateProject({ ...projectSpec, name: projectName3d }); // can't reuse for 3d if already has 2d tasks
    cy.wait('@createProjectRequest');
    cy.headlessCreateProject(projectDeleteLabelSpec); // label deletion tests require project to have only one label
    cy.wait('@createProjectRequest');

    // Tests that check project deletion
    cy.headlessCreateProject(projectDeleteSpec);
    cy.wait('@createProjectRequest');
    cy.headlessCreateProject(projectDeleteSpec);
    cy.wait('@createProjectRequest');
});
