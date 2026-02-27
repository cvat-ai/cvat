// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('CSV Export from different pages', () => {
    const labelName = 'car';
    const projectName = 'CSV Export Test Project';
    const taskNames = ['CSV Export Task 1', 'CSV Export Task 2'];
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];

    let projectID = null;
    const taskIDs = [];
    const jobIDs = [];

    before(() => {
        cy.headlessLogout();
        cy.visit('/auth/login');
        cy.login();

        cy.headlessCreateProject({
            name: projectName,
            labels: [{ name: labelName, attributes: [], type: 'any' }],
        }).then((response) => {
            projectID = response.projectID;

            const createTaskPromises = taskNames.map((taskName) => {
                const { taskSpec, dataSpec, extras } = defaultTaskSpec({
                    taskName,
                    serverFiles,
                    projectID,
                });
                delete taskSpec.labels;
                return cy.headlessCreateTask(taskSpec, dataSpec, extras).then((taskResponse) => {
                    taskIDs.push(taskResponse.taskID);
                    jobIDs.push(taskResponse.jobIDs[0]);
                });
            });

            return Cypress.Promise.all(createTaskPromises);
        });
    });

    after(() => {
        if (projectID) {
            cy.headlessDeleteProject(projectID);
        }
    });

    describe('Test CSV export from Jobs page', () => {
        it('Export jobs list as CSV from Jobs page', () => {
            cy.get('.cvat-header-jobs-button').click();
            cy.get('.cvat-jobs-page').should('exist').and('be.visible');
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-jobs-page-search-bar input').type(projectName);
            cy.get('.cvat-jobs-page-search-bar .ant-input-search-button').click();
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-jobs-export-csv-button').click();

            const timestamp = new Date().toISOString().split('T')[0];
            const expectedFileName = `cvat-jobs-${timestamp}.csv`;
            cy.verifyDownload(expectedFileName);

            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Job URL,Task ID,Task Name,Task URL,Project ID,Project Name,Project URL',
                3,
                (row, index) => {
                    expect(row).to.include(taskNames[taskNames.length - index - 1]);
                    expect(row).to.include(projectName);
                },
            );
        });
    });

    describe('Test CSV export from Tasks page', () => {
        it('Export tasks list as CSV from Tasks page', () => {
            cy.visit('/tasks');
            cy.get('.cvat-tasks-page').should('exist').and('be.visible');
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-tasks-page-search-bar input').type(projectName);
            cy.get('.cvat-tasks-page-search-bar .ant-input-search-button').click();
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-tasks-export-csv-button').click();

            const timestamp = new Date().toISOString().split('T')[0];
            const expectedFileName = `cvat-tasks-${timestamp}.csv`;
            cy.verifyDownload(expectedFileName);

            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Name,Task URL,Project ID,Project Name,Project URL',
                3,
                (row) => {
                    expect(row).to.include(projectName);
                },
            );
        });
    });

    describe('Test CSV export from Task page', () => {
        it('Export task jobs as CSV from Task page', () => {
            cy.openTaskById(taskIDs[0]);
            cy.get('.cvat-task-details').should('exist').and('be.visible');

            cy.get('.cvat-jobs-export-csv-button').click();

            const timestamp = new Date().toISOString().split('T')[0];
            const expectedFileName = `cvat-jobs-${timestamp}.csv`;
            cy.verifyDownload(expectedFileName);

            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Job URL,Task ID,Task Name,Task URL,Project ID,Project Name,Project URL',
                2,
                (row) => {
                    expect(row).to.include(taskNames[0]);
                    expect(row).to.include(projectName);
                },
            );
        });
    });

    describe('Test CSV export from Project page', () => {
        it('Export project tasks as CSV from Project page', () => {
            cy.visit(`/projects/${projectID}`);
            cy.get('.cvat-project-details').should('exist').and('be.visible');
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-tasks-export-csv-button').click();

            const timestamp = new Date().toISOString().split('T')[0];
            const expectedFileName = `cvat-tasks-${timestamp}.csv`;
            cy.verifyDownload(expectedFileName);

            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Name,Task URL,Project ID,Project Name,Project URL',
                3,
                (row) => {
                    expect(row).to.include(projectName);
                },
            );
        });
    });
});
