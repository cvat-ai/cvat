// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

const issueId = '10470';
const PROJECTS_COUNT = 15; // projects pageSize=12 — page 2 exists
const TASKS_COUNT = 11; // single-project tasks pageSize=10 — page 2 exists
const projectPrefix = `issue-${issueId}-project`;
const taskPrefix = `issue-${issueId}-task`;

context(`Issue ${issueId} - Pagination state is preserved on page reload`, () => {
    const projectIds = [];
    let hostProjectId = null;

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();
    });

    after(() => {
        projectIds.forEach(cy.headlessDeleteProject);
        if (hostProjectId !== null) {
            cy.headlessDeleteProject(hostProjectId);
        }
        cy.headlessLogout();
    });

    describe('Projects page', () => {
        before(() => {
            for (let i = 1; i <= PROJECTS_COUNT; i++) {
                cy.headlessCreateProject({
                    name: `${projectPrefix}-${i}`,
                    labels: [],
                }).then(({ projectId }) => projectIds.push(projectId));
            }

            cy.visit('/projects');
            cy.get('.cvat-spinner').should('not.exist');
        });

        it('Navigate to page 2 via bottom pagination', () => {
            cy.get('.ant-pagination-item-2').should('be.visible').click();
            cy.get('.ant-pagination-item-active').should('have.text', '2');
        });

        it('Page 2 is preserved after page reload', () => {
            cy.reload();
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.ant-pagination-item-active').should('have.text', '2');
        });
    });

    describe('Single project page (tasks)', () => {
        before(() => {
            cy.headlessCreateProject({
                name: `${projectPrefix}-tasks-host`,
                labels: [{ name: 'label' }],
            }).then(({ projectId }) => {
                hostProjectId = projectId;

                for (let i = 1; i <= TASKS_COUNT; i++) {
                    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
                        projectId: hostProjectId,
                        taskName: `${taskPrefix}-${i}`,
                        labelName: 'label',
                        serverFiles: ['smallArchive.zip'],
                    });
                    delete taskSpec.labels; // task in a project inherits project labels
                    cy.headlessCreateTask(taskSpec, dataSpec, extras);
                }
            }).then(() => {
                cy.visit(`/projects/${hostProjectId}`);
                cy.get('.cvat-spinner').should('not.exist');
            });
        });

        it('Navigate to page 2 via tasks pagination', () => {
            cy.get('.cvat-project-tasks-pagination .ant-pagination-item-2', { log: false }).click();
            cy.get('.cvat-project-tasks-pagination .ant-pagination-item-active', { log: false })
                .invoke('text').should('eq', '2');
        });

        it('Page 2 is preserved after page reload', () => {
            cy.reload();
            cy.get('.cvat-spinner').should('not.exist');
            cy.get('.cvat-project-tasks-pagination .ant-pagination-item-active', { log: false })
                .invoke('text').should('eq', '2');
        });
    });
});
