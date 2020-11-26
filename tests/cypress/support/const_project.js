// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

export const projectName = 'Main project';
export const labelName = `Base label for ${projectName}`;
export const attrName = `Attr for ${labelName}`;
export const textDefaultValue = 'Some default value for type Text';
export const multiAttrParams = {
    additionalAttrName: `Attr 2`,
    additionalValue: `Attr value 2`,
    typeAttribute: 'Text',
};

it('Prepare to testing', () => {
    cy.visit('/');
    cy.login();
    cy.goToProjectsList();
    cy.get('.cvat-projects-page').should('exist');
    let listItems = [];
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
