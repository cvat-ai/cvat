// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />
/// <reference types="../../support/index.d.ts" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Bulk actions in UI', () => {
    const taskName = 'task_bulk_actions';
    const projectName = 'project_bulk_actions';
    const serverFiles = ['smallArchive.zip'];
    const labelName = 'car';
    const project = {
        name: projectName,
        label: 'car',
        attrName: 'color',
        attrValue: 'red',
        multiAttrParams: false,
    };
    const projectSpec = {
        name: project.name,
        labels: [{
            name: labelName,
            attributes: [{
                name: project.attrName,
                mutable: false,
                input_type: 'text',
                default_value: project.attrValue,
                values: [project.attrValue],
            }],
        }],
    };
    const projects = [];
    const nobjs = 2;
    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();

        /* minimal setup:
            two projects:
                one with which with two tasks,
                    one of which with two jobs
        */
        const framesPerJob = 1;
        const stringID = (i, str) => str.concat(`_${i}`);
        const createTaskInProject = (i, projectID, taskParams) => {
            const { taskSpec, dataSpec, extras } = defaultTaskSpec({
                ...taskParams,
                projectID,
                taskName: stringID(i, taskParams.taskName),
            });
            return cy.headlessCreateTask(taskSpec, dataSpec, extras);
        };
        const createProject = (i) => cy.headlessCreateProject({
            ...projectSpec,
            name: stringID(i, projectName),
        });
        createProject(1).then(({ projectID }) => projects.push(projectID)); // empty project
        createProject(2).then(({ projectID }) => {
            // default task with 1 job
            createTaskInProject(1, projectID, { taskName, labelName, serverFiles });

            // default task with 2 jobs
            createTaskInProject(2, projectID, {
                taskName, labelName, serverFiles, segmentSize: framesPerJob,
            }).then(() => {
                cy.visit(`/projects/${projectID}`);
            });
            projects.push(projectID);
        });
    });

    after(() => {
        projects.forEach(cy.headlessDeleteProject);
    });

    describe('Bulk-change object attributes, confirm UI state', () => {
        context('Project page, change tasks', () => {
            it('"Select all", all items are selected, "Deselect" button is visible', () => {
                cy.get('.cvat-item-selected').should('not.exist');
                cy.get('.cvat-resource-select-all-button')
                    .should('be.visible')
                    .and('have.text', 'Select all')
                    .click();
                cy.get('.cvat-item-selected')
                    .should('exist')
                    .its('length')
                    .should('eq', nobjs);
                cy.get('.cvat-resource-deselect-button')
                    .should('be.visible')
                    .and('have.text', 'Deselect');
                cy.get('.cvat-resource-selection-count')
                    .should('be.visible')
                    .and('have.text', `Selected: ${nobjs}`);
            });

            it('Bulk-change assignees', () => {
                cy.get('.cvat-item-selected').first().within(() => {
                    cy.get('.cvat-actions-menu-button').click();
                });
                cy.get('.ant-dropdown').within(() => {
                    cy.contains(`Assignee (${nobjs})`).click();
                    cy.get('.cvat-user-search-field').type('admin', { delay: 0 }); // type all at once
                    cy.get('.cvat-user-search-field').type('{enter}');
                });
                cy.get('.cvat-bulk-progress-wrapper').should('be.visible');

                // Navigate to task with 2 jobs
                cy.get('.cvat-item-open-task-button').first().click();
            });
        });

        context('Task page, change jobs', () => {
            it('Ensure task was assigned to admin', () => {
                cy.get('[value="admin"]').should('exist');
            });

            it('Bulk-change assignees', () => {
                cy.contains('Select all').click();
                cy.get('.cvat-item-selected').first().within(() => {
                    cy.get('.cvat-actions-menu-button').click();
                });
                cy.get('.ant-dropdown').within(() => {
                    cy.contains(`Assignee (${nobjs})`).click();
                    cy.get('.cvat-user-search-field').type('admin', { delay: 0 }); // all at once
                    cy.get('.cvat-user-search-field').type('{enter}');
                });
                cy.get('.cvat-bulk-progress-wrapper').should('be.visible');

                cy.get('.cvat-job-assignee-selector').each(($el) => {
                    cy.wrap($el).find('[value="admin"]').should('exist');
                });
            });

            it('Bulk-change state', () => {
                cy.contains('Select all').click();
                cy.get('.cvat-item-selected').first().within(() => {
                    cy.get('.cvat-actions-menu-button').click();
                });
                cy.get('.ant-dropdown').within(() => {
                    cy.contains(`State (${nobjs})`).click();
                    cy.get('.cvat-job-item-state').click();

                    // state is new by default, so pick second option (=in progress)
                    cy.get('.ant-select-selection-search').type('{downarrow}');
                    cy.get('.ant-select-selection-search').type('{enter}');
                });
                cy.get('.cvat-bulk-progress-wrapper').should('be.visible');

                cy.get('.ant-select-selection-item[title="in progress"]')
                    .should('have.length', nobjs);
            });
        });
    });

    describe('Bulk export', () => {
        it('Bulk-export job annotations', () => {
            cy.contains('Select all').click();
            cy.get('.cvat-item-selected').first().within(() => {
                cy.get('.cvat-actions-menu-button').click();
            });
            cy.contains(`Export annotations (${nobjs})`)
                .should('be.visible')
                .click();

            cy.get('.cvat-modal-export-job')
                .should('exist').and('be.visible')
                .find('.ant-modal-header')
                .should('have.text', `Export ${nobjs} jobs as datasets`);
            cy.get('.cvat-modal-export-job').contains('button', 'OK').click();

            cy.get('.cvat-notification-notice-export-job-start')
                .should('be.visible');
            cy.closeNotification('.cvat-notification-notice-export-job-start');

            cy.get(':visible:contains("Export is finished")')
                .should('have.length', nobjs);
            // cy.contains only yields the first
            // https://docs.cypress.io/api/commands/contains#Single-Element
        });
    });
});
