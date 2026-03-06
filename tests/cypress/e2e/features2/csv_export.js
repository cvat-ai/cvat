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

    function verifyDescendingOrder(ids) {
        for (let i = 0; i < ids.length - 1; i++) {
            expect(ids[i]).to.be.greaterThan(ids[i + 1]);
        }
        expect(ids).to.deep.equal([...ids].sort((a, b) => b - a));
    }

    const validators = {
        jobId: (columns) => {
            const jobId = parseInt(columns[0], 10);
            expect(jobIDs).to.include(jobId);
        },
        taskId: (expectedTaskId = null) => (columns) => {
            const taskId = parseInt(columns[2], 10);
            expect(taskIDs).to.include(taskId);
            if (expectedTaskId !== null) {
                expect(taskId).to.equal(expectedTaskId);
            }
        },
        taskIdFromColumn: (columnIndex) => (columns) => {
            const taskId = parseInt(columns[columnIndex], 10);
            expect(taskIDs).to.include(taskId);
        },
        taskName: (columnIndex) => (columns) => {
            const taskName = columns[columnIndex];
            expect(taskNames).to.include(taskName);
        },
        jobUrls: (columns) => {
            const jobId = parseInt(columns[0], 10);
            const taskId = parseInt(columns[2], 10);
            expect(columns[1]).to.include(`/tasks/${taskId}/jobs/${jobId}`);
            expect(columns[4]).to.include(`/tasks/${taskId}`);
            expect(columns[7]).to.include(`/projects/${projectID}`);
        },
        taskUrls: (columns) => {
            const taskId = parseInt(columns[0], 10);
            expect(columns[2]).to.include(`/tasks/${taskId}`);
            expect(columns[5]).to.include(`/projects/${projectID}`);
        },
        projectData: (idColumn, nameColumn) => (columns) => {
            expect(columns[idColumn]).to.equal(String(projectID));
            expect(columns[nameColumn]).to.equal(projectName);
        },
        hasTaskName: (columns, row) => {
            const hasTaskName = taskNames.some((name) => row.includes(name));
            expect(hasTaskName).to.equal(true);
        },
    };

    function createRowValidator(columnValidators) {
        return (row) => {
            const columns = row.split(',');
            columnValidators.forEach((validator) => validator(columns, row));
        };
    }

    function createJobRowValidator(expectedTaskId = null) {
        return createRowValidator([
            validators.jobId,
            validators.taskId(expectedTaskId),
            validators.jobUrls,
            validators.projectData(5, 6),
            validators.hasTaskName,
        ]);
    }

    function createTaskRowValidator() {
        return createRowValidator([
            validators.taskIdFromColumn(0),
            validators.taskName(1),
            validators.taskUrls,
            validators.projectData(3, 4),
        ]);
    }

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

            const collectedJobIds = [];
            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Job URL,Task ID,Task Name,Task URL,Project ID,Project Name,Project URL',
                3,
                (row) => {
                    const columns = row.split(',');
                    const jobId = parseInt(columns[0], 10);
                    collectedJobIds.push(jobId);
                    createJobRowValidator()(row);
                },
            );
            cy.wrap(null).then(() => {
                verifyDescendingOrder(collectedJobIds);
            });
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

            const collectedTaskIds = [];
            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Name,Task URL,Project ID,Project Name,Project URL',
                3,
                (row) => {
                    const columns = row.split(',');
                    const taskId = parseInt(columns[0], 10);
                    collectedTaskIds.push(taskId);
                    createTaskRowValidator()(row);
                },
            );
            cy.wrap(null).then(() => {
                verifyDescendingOrder(collectedTaskIds);
            });
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
                createJobRowValidator(taskIDs[0]),
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

            const collectedTaskIds = [];
            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Name,Task URL,Project ID,Project Name,Project URL',
                3,
                (row) => {
                    const columns = row.split(',');
                    const taskId = parseInt(columns[0], 10);
                    collectedTaskIds.push(taskId);
                    createTaskRowValidator()(row);
                },
            );
            cy.wrap(null).then(() => {
                verifyDescendingOrder(collectedTaskIds);
            });
        });
    });

    describe('Test CSV export from Projects page', () => {
        it('Export projects list as CSV from Projects page', () => {
            cy.visit('/projects');
            cy.get('.cvat-projects-page').should('exist').and('be.visible');
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-projects-page-search-bar input').type(projectName);
            cy.get('.cvat-projects-page-search-bar .ant-input-search-button').click();
            cy.get('.cvat-spinner').should('not.exist');

            cy.get('.cvat-projects-export-csv-button').click();

            const timestamp = new Date().toISOString().split('T')[0];
            const expectedFileName = `cvat-projects-${timestamp}.csv`;
            cy.verifyDownload(expectedFileName);

            cy.checkCsvFileContent(
                expectedFileName,
                'ID,Name,Project URL',
                2,
                (row) => {
                    const columns = row.split(',');
                    const projectId = parseInt(columns[0], 10);
                    expect(projectId).to.equal(projectID);
                    expect(columns[1]).to.equal(projectName);
                    expect(columns[2]).to.include(`/projects/${projectID}`);
                },
            );
        });
    });
});
