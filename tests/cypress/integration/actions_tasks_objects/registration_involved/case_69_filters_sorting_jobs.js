// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Filters, sorting jobs.', () => {
    const caseId = '69';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 15;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const advancedConfigurationParams = {
        multiJobs: true,
        segmentSize: 5,
    };

    const secondUserName = 'Case69';
    const secondUser = {
        firstName: `Firtstname`,
        lastName: `Lastname`,
        emailAddr: `${secondUserName.toLowerCase()}@local.local`,
        password: 'Pass!UserCase69',
    };

    const createIssueRectangle = {
        type: 'rectangle',
        description: 'Wrong position',
        firstX: 550,
        firstY: 100,
        secondX: 650,
        secondY: 200,
    };

    function checkJobsTableRowCount(expectedCount) {
        if (expectedCount !== 0) {
            cy.get('.cvat-task-jobs-table-row').then(($jobsTableRows) => {
                expect($jobsTableRows.length).to.be.equal(expectedCount);
            });
        } else {
            cy.get('.cvat-task-jobs-table-row').should('not.exist');
        }
    }

    function checkContentsRow(index, status, assignee, reviewer) {
        cy.get('.cvat-task-jobs-table-row').then(($jobsTableRows) => {
            cy.get($jobsTableRows[index]).within(() => {
                cy.get('.cvat-job-item-status').invoke('text').should('equal', status);
                [
                    ['.cvat-job-assignee-selector', assignee],
                    ['.cvat-job-reviewer-selector', reviewer],
                ].forEach(([el, val]) => {
                    cy.get(el).find('[type="search"]').invoke('val').should('equal', val);
                });
            });
        });
    }

    function testSetJobFilter({ column, menuItem, reset }) {
        cy.get(column).find('[role="button"]').click().wait(300); // Wait for dropdown menu transition
        cy.get('.ant-dropdown')
            .not('.ant-dropdown-hidden')
            .within(() => {
                if (!reset) {
                    cy.contains('[role="menuitem"]', menuItem)
                        .find('[type="checkbox"]')
                        .should('not.be.checked')
                        .check()
                        .should('be.checked');
                    cy.contains('[type="button"]', 'OK').click();
                } else {
                    cy.contains('[type="button"]', 'Reset').click();
                }
            });
    }

    before(() => {
        // Preparing a jobs
        cy.visit('auth/register');
        cy.userRegistration(
            secondUser.firstName,
            secondUser.lastName,
            secondUserName,
            secondUser.emailAddr,
            secondUser.password,
        );
        cy.logout(secondUserName);
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.login();
        cy.createAnnotationTask(
            taskName,
            labelName,
            attrName,
            textDefaultValue,
            archiveName,
            false,
            advancedConfigurationParams,
        );
        cy.openTask(taskName);
        cy.assignJobToUser(0, secondUserName);
        cy.assignJobToUser(1, secondUserName);
        cy.logout();

        // The first job is transferred to the validation status
        cy.login(secondUserName, secondUser.password);
        cy.openTaskJob(taskName);
        cy.changeWorkspace('Review');
        cy.createIssueFromControlButton(createIssueRectangle);
        cy.interactMenu('Request a review');
        cy.get('.cvat-request-review-dialog')
            .should('exist')
            .within(() => {
                cy.get('.cvat-user-search-field')
                    .find('[type="search"]')
                    .type(`${Cypress.env('user')}{Enter}`);
                cy.contains('[type="button"]', 'Submit').click();
            });
        cy.checkJobStatus(0, 'validation', secondUserName, Cypress.env('user'));

        // The first job is transferred to the complete status
        cy.openJob(1);
        cy.changeWorkspace('Review');
        cy.createIssueFromControlButton(createIssueRectangle);
        cy.interactMenu('Request a review');
        cy.get('.cvat-request-review-dialog')
            .should('exist')
            .within(() => {
                cy.get('.cvat-user-search-field')
                    .find('[type="search"]')
                    .type(`${Cypress.env('user')}{Enter}`);
                cy.contains('[type="button"]', 'Submit').click();
            });
        cy.logout(secondUserName);
        cy.login();
        cy.openTaskJob(taskName, 1);
        cy.resolveIssue('.cvat-hidden-issue-label', 'Done');
        cy.interactMenu('Submit the review');
        cy.submitReview('Accept');
        cy.checkJobStatus(1, 'completed', secondUserName, Cypress.env('user'));
    });

    after(() => {
        cy.logout();
        cy.deletingRegisteredUsers([secondUserName]);
        cy.login();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}". Issue 2572.`, () => {
        it('Feltering jobs by status.', () => {
            testSetJobFilter({ column: '.cvat-job-item-status', menuItem: 'annotation' });
            checkJobsTableRowCount(1);
            checkContentsRow(0, 'annotation', '', '');
        });

        it('Feltering jobs by status and by assignee.', () => {
            testSetJobFilter({ column: '.cvat-job-item-assignee', menuItem: secondUserName });
            checkJobsTableRowCount(0);
            testSetJobFilter({ column: '.cvat-job-item-assignee', reset: true });
            checkJobsTableRowCount(1);
        });

        it('Feltering jobs by status. Annotation and validation', () => {
            testSetJobFilter({ column: '.cvat-job-item-status', menuItem: 'validation' });
            checkJobsTableRowCount(2);
            checkContentsRow(0, 'validation', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'annotation', '', '');
        });

        it('Feltering jobs by status. Annotation, validation, completed', () => {
            testSetJobFilter({ column: '.cvat-job-item-status', menuItem: 'completed' });
            checkJobsTableRowCount(3);
            checkContentsRow(0, 'validation', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'completed', secondUserName, Cypress.env('user'));
            checkContentsRow(2, 'annotation', '', '');
            testSetJobFilter({ column: '.cvat-job-item-status', reset: true }); // Reset filter by status
        });

        it('Feltering jobs by reviewer and sort by ascending status.', () => {
            testSetJobFilter({ column: '.cvat-job-item-reviewer', menuItem: Cypress.env('user') });
            checkContentsRow(0, 'validation', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'completed', secondUserName, Cypress.env('user'));
            cy.contains('.cvat-job-item-status', 'Status').click();
            checkContentsRow(0, 'completed', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'validation', secondUserName, Cypress.env('user'));
        });

        it('Feltering jobs by reviewer and sort by ascending status, assignee.', () => {
            cy.contains('.cvat-job-item-status', 'Status').click();
            cy.contains('.cvat-job-item-assignee', 'Assignee').click();
            checkContentsRow(0, 'validation', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'completed', secondUserName, Cypress.env('user'));
        });
    });
});
