// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const issueId = '10470';
const PROJECTS_COUNT = 15; // projects pageSize=12 — page 2 exists
const projectPrefix = `issue-${issueId}-project`;

context(`Issue ${issueId} - Pagination state is preserved on navigation`, () => {
    const projectIds = [];

    // Open the projects list and wait until the first page has fully settled.
    // The list request must complete before interacting, otherwise a still
    // in-flight initial fetch can override the subsequent page switch (this only
    // surfaces on warm headless runs where the page loads fast).
    function openSettledProjectsList() {
        cy.intercept('GET', '/api/projects?*').as('getProjects');
        cy.visit('/projects');
        cy.wait('@getProjects');
        cy.get('.cvat-spinner').should('not.exist');
        cy.get('.cvat-projects-project-item-card').should('have.length', 12);
        cy.get('.ant-pagination-item-active').should('have.text', '1');
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();

        for (let i = 1; i <= PROJECTS_COUNT; i++) {
            cy.headlessCreateProject({
                name: `${projectPrefix}-${i}`,
                labels: [],
            }).then(({ projectId }) => projectIds.push(projectId));
        }
    });

    after(() => {
        projectIds.forEach(cy.headlessDeleteProject);
        cy.headlessLogout();
    });

    describe('Projects page with back navigation', () => {
        before(() => {
            openSettledProjectsList();
        });

        it('Navigate to page 2 via bottom pagination', () => {
            cy.get('.ant-pagination-item-2').should('be.visible').click();
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.ant-pagination-item-active').should('have.text', '2');
        });

        it('Open the first project on page 2', () => {
            cy.get('.cvat-projects-project-item-title').first().click();
            cy.get('.cvat-project-details').should('exist');
        });

        it('Page 2 is preserved after browser back navigation', () => {
            cy.go('back');
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.ant-pagination-item-active').should('have.text', '2');
        });
    });

    describe('Projects page with page refresh', () => {
        before(() => {
            openSettledProjectsList();
        });

        it('Navigate to page 2 via bottom pagination', () => {
            cy.get('.ant-pagination-item-2').should('be.visible').click();
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.ant-pagination-item-active').should('have.text', '2');
        });

        it('Page 2 is preserved after page reload', () => {
            cy.reload();
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.ant-pagination-item-active').should('have.text', '2');
        });
    });
});
