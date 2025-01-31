// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

export const projectName = 'Main project';
export const labelName = `Base label for ${projectName}`;
export const attrName = `Attr for ${labelName}`;
export const textDefaultValue = 'Some default value for type Text';
export const multiAttrParams = {
    name: 'Attr 2',
    values: 'Attr value 2',
    type: 'Text',
};

it('Prepare to testing', () => {
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
