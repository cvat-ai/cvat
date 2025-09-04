// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    projectName,
    labelName,
    attrName,
    textDefaultValue,
    multiAttrParams,
} from '../../support/const_project';

it('Prepare to testing projects', () => {
    // TODO: refactor to headless requests

    cy.visit('/auth/login');
    cy.login();
    cy.goToProjectsList();
    cy.get('.cvat-projects-page').should('exist');
    const listItems = [];
    cy.document().then((doc) => {
        const collection = Array.from(doc.querySelectorAll('.cvat-projects-project-item-title'));
        for (let i = 0; i < collection.length; i++) {
            listItems.push(collection[i].innerText);
        }
        if (listItems.indexOf(projectName) === -1) {
            cy.task('log', "A project doesn't exist. Creating.");
            cy.createProjects(projectName, labelName, attrName, textDefaultValue, multiAttrParams);
        } else {
            cy.task('log', 'The project exist. Skipping creation.');
        }
    });
});
