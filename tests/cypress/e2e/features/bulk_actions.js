// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />
/// <reference types="../../support/index.d.ts" />

import { defaultTaskSpec } from '../../support/default-specs';

context('This is your test project title', () => {
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
            const njobs = 2;
            it('"Select all", all items are selected, "Deselect" button is visible', () => {
                cy.get('.cvat-item-selected').should('not.exist');
                cy.get('.cvat-resource-select-all-button')
                    .should('be.visible')
                    .and('have.text', 'Select all')
                    .click();
                cy.get('.cvat-item-selected')
                    .should('exist')
                    .its('length')
                    .should('eq', njobs);
                cy.get('.cvat-resource-deselect-button')
                    .should('be.visible')
                    .and('have.text', 'Deselect');
                cy.get('.cvat-resource-selection-count')
                    .should('be.visible')
                    .and('have.text', `Selected: ${njobs}`);
            });

            it('Bulk-change assignees, ensure successful', () => {
                cy.get('.cvat-item-selected').first().within(() => {
                    cy.get('.cvat-actions-menu-button').click();
                });
                cy.get('.ant-dropdown').within(() => {
                    cy.contains(`Assignee (${njobs})`).click();
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
        });
    });
});
