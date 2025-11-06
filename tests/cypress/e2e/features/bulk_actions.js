// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';
import { createDummyAWSBucket } from '../../support/dummy-data';

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
    const taskTwoJobs = {
        ID: null,
        jobIDs: [],
    };
    let projectTwoTasks = null;
    const numberOfObjects = 2;
    const framesPerJob = 1;
    const stringID = (i, str) => str.concat(`_${i}`);
    const createTaskInProject = (i, projectID, taskParams) => {
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            ...taskParams,
            projectID,
            taskName: stringID(i, taskParams.taskName),
        });
        delete taskSpec.labels; // can only have labels or project_id
        return cy.headlessCreateTask(taskSpec, dataSpec, extras);
    };
    const createProject = (i) => cy.headlessCreateProject({
        ...projectSpec,
        name: stringID(i, projectName),
    });
    function selectAll() {
        cy.get('.cvat-bulk-wrapper').should('exist').and('be.visible');
        cy.contains('Select all').click();
    }
    function getBulkActionsMenu() {
        selectAll();
        cy.get('.cvat-item-selected').first().within(() => {
            cy.get('.cvat-actions-menu-button').click();
        });
        return cy.get('.ant-dropdown');
    }

    function assignToAdmin() {
        cy.contains(`Assignee (${numberOfObjects})`).click();
        cy.get('.cvat-user-search-field').type('admin', { delay: 0 }); // all at once
        return cy.get('.cvat-user-search-field').type('{enter}');
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();

        createProject(1).then(({ projectID }) => projects.push(projectID)); // empty project
        createProject(2).then(({ projectID }) => {
            projects.push(projectID);
            projectTwoTasks = projectID;

            // default task with 1 job
            createTaskInProject(1, projectID, { taskName, labelName, serverFiles });

            // default task with 2 jobs
            createTaskInProject(2, projectID, {
                taskName, labelName, serverFiles, segmentSize: framesPerJob,
            }).then(({ taskID, jobIDs }) => {
                taskTwoJobs.ID = taskID;
                taskTwoJobs.jobIDs = jobIDs;
            });
        });
    });

    after(() => {
        projects.forEach(cy.headlessDeleteProject);
        cy.headlessLogout();
    });

    describe('Bulk-change object attributes, confirm UI state', () => {
        before(() => {
            cy.openProjectById(projectTwoTasks);
        });
        context('Project page, change tasks', () => {
            it('"Select all", all items are selected, "Deselect" button is visible', () => {
                cy.get('.cvat-item-selected').should('not.exist');
                cy.get('.cvat-bulk-wrapper')
                    .should('exist')
                    .and('be.visible');
                cy.get('.cvat-resource-select-all-button')
                    .should('be.visible')
                    .and('have.text', 'Select all')
                    .click();
                cy.get('.cvat-item-selected')
                    .should('exist')
                    .its('length')
                    .should('eq', numberOfObjects);
                cy.get('.cvat-resource-selection-count')
                    .should('be.visible')
                    .and('have.text', `Selected: ${numberOfObjects}`);
                cy.get('.cvat-resource-deselect-button')
                    .should('be.visible')
                    .and('have.text', 'Deselect').click();
                cy.get('.cvat-item-selected').should('not.exist');
            });

            it('Bulk-change assignees', () => {
                getBulkActionsMenu().within(() => {
                    assignToAdmin();
                });
                cy.get('.cvat-bulk-progress-wrapper').should('be.visible');

                cy.openTaskById(taskTwoJobs.ID);

                // Ensure task was assigned to admin
                cy.get('.cvat-user-search-field').first()
                    .should('exist').within(() => {
                        cy.get('[value="admin"]');
                    });
            });
        });

        context('Task page, change jobs', () => {
            before(() => {
                cy.openTaskById(taskTwoJobs.ID);
            });

            it('Bulk-change assignees', () => {
                getBulkActionsMenu().within(() => {
                    assignToAdmin();
                });
                cy.get('.cvat-bulk-progress-wrapper').should('be.visible');

                cy.get('.cvat-job-assignee-selector').each(($el) => {
                    cy.wrap($el).find('[value="admin"]').should('exist');
                });
            });

            it('Bulk-change state', () => {
                getBulkActionsMenu().within(() => {
                    cy.contains(`State (${numberOfObjects})`).click();
                    cy.get('.cvat-job-item-state').click();

                    // state is 'new' by default, so pick second option (='in progress')
                    cy.get('.ant-select-selection-search').type('{downarrow}');
                    cy.get('.ant-select-selection-search').type('{enter}');
                });
                cy.get('.cvat-bulk-progress-wrapper').should('be.visible');

                cy.get('.ant-select-selection-item[title="in progress"]')
                    .should('have.length', numberOfObjects);
            });
        });
    });

    describe('Bulk export', () => {
        before(() => {
            cy.openTaskById(taskTwoJobs.ID);
        });
        it('Bulk-export job annotations', () => {
            getBulkActionsMenu().within(() => {
                cy.contains(`Export annotations (${numberOfObjects})`)
                    .should('be.visible')
                    .click();
            });

            cy.get('.cvat-modal-export-job')
                .should('exist').and('be.visible')
                .find('.ant-modal-header')
                .should('have.text', `Export ${numberOfObjects} jobs as datasets`);
            cy.get('.cvat-modal-export-job').contains('button', 'OK').click();

            cy.get('.cvat-notification-notice-export-job-start')
                .should('be.visible');
            cy.closeNotification('.cvat-notification-notice-export-job-start');

            cy.closeNotification('.cvat-notification-notice-export-job-finished', numberOfObjects);
        });
    });

    describe('Delete all tasks in project', () => {
        before(() => {
            cy.openProjectById(projectTwoTasks);
        });

        it('Delete all tasks, ensure deletion', () => {
            getBulkActionsMenu().within(() => {
                cy.contains(`Delete (${numberOfObjects})`).click();
            });

            cy.get('.cvat-modal-confirm-delete-task')
                .should('be.visible').within(() => {
                    cy.contains(`Delete ${numberOfObjects} selected tasks`);
                    cy.contains('Delete selected')
                        .should('be.visible')
                        .click();
                });
            cy.get('.cvat-bulk-progress-wrapper').should('be.visible');
            cy.get('.cvat-tasks-list-item').each(($el) => {
                cy.wrap($el)
                    .invoke('attr', 'style')
                    .should('include', 'pointer-events: none');
            });
        });
    });

    describe('Bulk actions cloud storage', () => {
        before(() => {
            for (let i = 0; i < numberOfObjects; i++) {
                cy.headlessAttachCloudStorage(createDummyAWSBucket);
            }
            cy.goToCloudStoragesPage();
        });
        it('Delete all CS, ensure deleted ', () => {
            getBulkActionsMenu().within(() => {
                cy.contains(`Delete (${numberOfObjects})`).click();
            });

            cy.get('.cvat-modal-confirm-delete-cloud-storage')
                .should('be.visible').within(() => {
                    cy.contains(`Delete ${numberOfObjects} selected cloud storages`);
                    cy.contains('Delete selected')
                        .should('be.visible')
                        .click();
                });
            cy.get('.cvat-cloud-storage-item').each(($el) => {
                cy.wrap($el)
                    .invoke('attr', 'style')
                    .should('include', 'pointer-events: none');
            });
        });
    });
});
