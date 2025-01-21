// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const issueId = '5381';
const project = {
    name: `Issue ${issueId}`,
    label: 'Tree',
    attrName: 'Kind',
    attrVaue: 'Oak',
};

context('List of export formats for a project without tasks is not empty', () => {
    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.goToProjectsList();
        cy.createProjects(project.name, project.label, project.attrName, project.attrVaue);
        cy.goToProjectsList();
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Export formats list is not empty for empty project', () => {
            cy.clickInProjectMenu('Export dataset', false, project.name);
            cy.get('.cvat-modal-export-project').should('be.visible').find('.cvat-modal-export-select').click();
            cy.get('.cvat-modal-export-option-item').should('have.length.above', 0);
        });
    });
});
