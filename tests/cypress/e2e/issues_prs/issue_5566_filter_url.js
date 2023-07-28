// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const issueId = '5566';

const project = {
    // Ampersand in the name ensures that the query string will be incorrect
    // if the UI fails to escape the filter value.
    name: 'A & B',
    label: 'Tree',
    attrName: 'Kind',
    attrVaue: 'Oak',
};

context('The filter in the URL is correctly escaped', () => {
    let projectID;

    function getProjectID() {
        cy.contains('.cvat-project-name', project.name)
            .parents('.cvat-project-details')
            .should('have.attr', 'data-cvat-project-id')
            .then(($projectID) => {
                projectID = $projectID;
            });
    }

    before(() => {
        cy.visit('/');
        cy.login();

        cy.goToProjectsList();
        cy.createProjects(project.name, project.label, project.attrName, project.attrVaue);
        cy.openProject(project.name);
        getProjectID();
        cy.goToProjectsList();
    });

    after(() => {
        cy.deleteProject(project.name, projectID);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Set a filter for the project name', () => {
            cy.contains('.cvat-switch-filters-constructor-button', 'Filter').click();
            cy.get('.cvat-resource-page-filters-builder').within(() => {
                cy.contains('button', 'Add rule').click();
                cy.contains('.ant-select-selector', 'Select field').get('input').type('Name{enter}');
                cy.get('input[placeholder="Enter string"]').type(project.name);
                cy.contains('button', 'Apply').click();
            });
        });

        it('Filter in the URL is valid JSON', () => {
            cy.location().should((loc) => {
                const params = new URLSearchParams(loc.search);
                const filter = params.get('filter');
                expect(filter).to.be.a('string');
                const filterObj = JSON.parse(filter);
                expect(filterObj).to.be.an('object');
            });
        });
    });
});
