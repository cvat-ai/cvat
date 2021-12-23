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
        firstName: 'Firtstname',
        lastName: 'Lastname',
        emailAddr: `${secondUserName.toLowerCase()}@local.local`,
        password: 'Pass!UserCase69',
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

    function checkContentsRow(index, stage, state, assignee) {
        cy.get('.cvat-task-jobs-table-row').then(($jobsTableRows) => {
            cy.get($jobsTableRows[index]).within(() => {
                cy.get('.cvat-job-item-stage').invoke('text').should('equal', stage);
                cy.get('.cvat-job-item-state').invoke('text').should('equal', state);
                [
                    ['.cvat-job-assignee-selector', assignee],
                ].forEach(([el, val]) => {
                    cy.get(el).find('[type="search"]').invoke('val').should('equal', val);
                });
            });
        });
    }

    function testSetJobFilter({ column, menuItem, reset }) {
        cy.get(column).find('[role="button"]').trigger('mouseover').click().wait(300); // Waiting for dropdown menu transition
        cy.get('.ant-dropdown')
            .not('.ant-dropdown-hidden')
            .within(() => {
                if (!reset) {
                    cy.contains('[role="menuitem"]', menuItem)
                        .find('[type="checkbox"]')
                        .should('not.be.checked')
                        .check()
                        .should('be.checked');
                    cy.contains('[type="button"]', 'OK').should('be.visible').click();
                } else {
                    cy.contains('[type="button"]', 'Reset').should('be.visible').click();
                }
            });
        cy.get('.ant-dropdown').last().should('be.hidden');
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

        // The first job is transferred to the complete status
        cy.openJob(1);
        cy.contains('.cvat-annotation-header-button', 'Menu').click();
        cy.get('.cvat-annotation-menu').within(() => {
            cy.contains('Change job state').click();
        });
        cy.get('.cvat-annotation-menu-job-state-submenu').within(() => {
            cy.contains('completed').click();
        });

        cy.contains('[type="button"]', 'Continue').click();
        cy.get('.cvat-spinner').should('not.exist');
        cy.interactMenu('Open the task');
        cy.get('.cvat-spinner').should('not.exist');
    });

    after(() => {
        cy.logout();
        cy.deletingRegisteredUsers([secondUserName]);
        cy.login();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}".`, () => {
        it('Filtering jobs by stage.', () => {
            testSetJobFilter({ column: '.cvat-job-item-stage', menuItem: 'annotation' });
            checkJobsTableRowCount(3);
            checkContentsRow(0, 'annotation', 'new', secondUserName);
        });

        it('Filtering jobs by assignee and stage (annotation).', () => {
            testSetJobFilter({ column: '.cvat-job-item-assignee', menuItem: secondUserName });
            checkJobsTableRowCount(2);
            testSetJobFilter({ column: '.cvat-job-item-assignee', reset: true });
            checkJobsTableRowCount(3);
        });

        it('Filtering jobs by stage (annotation, validation)', () => {
            testSetJobFilter({ column: '.cvat-job-item-stage', menuItem: 'validation' });
            checkJobsTableRowCount(3);
            checkContentsRow(0, 'annotation', 'new', secondUserName);
        });

        it('Filtering jobs by stage (annotation, validation, acceptance)', () => {
            testSetJobFilter({ column: '.cvat-job-item-stage', menuItem: 'acceptance' });
            checkJobsTableRowCount(3);
            checkContentsRow(0, 'annotation', 'new', secondUserName);
            checkContentsRow(1, 'annotation', 'completed', secondUserName);
            checkContentsRow(2, 'annotation', 'new', '');
            testSetJobFilter({ column: '.cvat-job-item-stage', reset: true }); // Reset filter by status
        });

        // FIXME: add tests to check state filtering
        // FIXME: no reviewer anymore
        it.skip('Filtering jobs by reviewer and sort by ascending status.', () => {
            testSetJobFilter({ column: '.cvat-job-item-reviewer', menuItem: Cypress.env('user') });
            checkContentsRow(0, 'validation', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'completed', secondUserName, Cypress.env('user'));
            cy.contains('.cvat-job-item-status', 'Status').click();
            checkContentsRow(0, 'completed', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'validation', secondUserName, Cypress.env('user'));
        });

        // FIXME: no reviewer anymore
        it.skip('Filtering jobs by reviewer and sort by ascending status, assignee.', () => {
            cy.contains('.cvat-job-item-status', 'Status').click();
            cy.contains('.cvat-job-item-assignee', 'Assignee').click();
            checkContentsRow(0, 'validation', secondUserName, Cypress.env('user'));
            checkContentsRow(1, 'completed', secondUserName, Cypress.env('user'));
        });
    });
});
