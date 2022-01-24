// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Filtering, sorting jobs.', () => {
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
        cy.getJobNum(index).then(($job) => {
            cy.get('.cvat-task-jobs-table')
                .contains('a', `Job #${$job}`)
                .parents('.cvat-task-jobs-table-row').within(() => {
                    cy.get('.cvat-job-item-stage').invoke('text').should('equal', stage);
                    cy.get('.cvat-job-item-state').invoke('text').should('equal', state);
                    cy.get('.cvat-job-item-assignee')
                        .find('[type="search"]')
                        .invoke('val')
                        .should('equal', assignee);
                });
        });
    }

    function testSetJobFilter({ column, menuItem, reset }) {
        cy.get(`.cvat-job-item-${column}`).find('[role="button"]').click();
        cy.get('.ant-dropdown')
            .should('be.visible')
            .not('.ant-dropdown-hidden')
            .should('not.have.class', 'ant-dropdown-hidden')
            .should('not.have.class', 'ant-slide-up')
            .within(() => {
                if (!reset) {
                    cy.contains('[role="menuitem"]', menuItem)
                        .find('[type="checkbox"]')
                        .should('not.be.checked')
                        .check()
                        .should('be.checked');
                    cy.get('[type="button"]').contains('OK').should('be.visible').click();
                } else {
                    cy.get('[type="button"]').contains('Reset').should('be.visible').click();
                    cy.get('[type="button"]').contains('OK').should('be.visible').click();
                }
            });
        cy.get('.ant-dropdown').should('be.hidden').and('have.class', 'ant-dropdown-hidden');
    }

    before(() => {
        // Preparing the jobs
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

        // The second job - status "completed"
        cy.openJob(1);
        cy.setJobState('completed');
        cy.interactMenu('Open the task');

        // The first job - stage "validation"
        cy.setJobStage(0, 'validation');
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [secondUserName]);
            cy.deleteTasks(authKey, [taskName]);
        });
    });

    describe(`Testing "${labelName}".`, () => {
        it('Check all statuses.', () => {
            checkJobsTableRowCount(3);
            checkContentsRow(0, 'validation', 'new', secondUserName); // The 1st job
            checkContentsRow(1, 'annotation', 'completed', secondUserName); // The 2nd job
            checkContentsRow(2, 'annotation', 'new', ''); // The 3th job
        });

        it('Filtering jobs by stage (annotation, validation, acceptance).', () => {
            testSetJobFilter({ column: 'stage', menuItem: 'annotation' });
            checkJobsTableRowCount(2);
            testSetJobFilter({ column: 'stage', reset: true });
            testSetJobFilter({ column: 'stage', menuItem: 'validation' });
            checkJobsTableRowCount(1);
            testSetJobFilter({ column: 'stage', reset: true });
            testSetJobFilter({ column: 'stage', menuItem: 'acceptance' });
            checkJobsTableRowCount(0);
            testSetJobFilter({ column: 'stage', reset: true });
        });

        it('Filtering jobs by assignee.', () => {
            testSetJobFilter({ column: 'assignee', menuItem: secondUserName });
            checkJobsTableRowCount(2);
            testSetJobFilter({ column: 'assignee', reset: true });
            checkJobsTableRowCount(3);
        });

        it('Filtering jobs by state (in progress, rejected, completed, new)', () => {
            testSetJobFilter({ column: 'state', menuItem: 'in progress' });
            checkJobsTableRowCount(0);
            testSetJobFilter({ column: 'state', menuItem: 'rejected' });
            checkJobsTableRowCount(0);
            testSetJobFilter({ column: 'state', menuItem: 'completed' });
            checkJobsTableRowCount(1);
            testSetJobFilter({ column: 'state', menuItem: 'new' });
            checkJobsTableRowCount(3);
            testSetJobFilter({ column: 'state', reset: true });
        });

        it('Filtering jobs by validation, new, assignee to user.', () => {
            testSetJobFilter({ column: 'stage', menuItem: 'validation' });
            testSetJobFilter({ column: 'state', menuItem: 'new' });
            testSetJobFilter({ column: 'assignee', menuItem: secondUserName });
            checkJobsTableRowCount(1);
            checkContentsRow(0, 'validation', 'new', secondUserName);
            testSetJobFilter({ column: 'stage', reset: true });
            testSetJobFilter({ column: 'state', reset: true });
            testSetJobFilter({ column: 'assignee', reset: true });
            checkJobsTableRowCount(3);
        });

        it('Sorting jobs by stage.', () => {
            const sortStage = [];
            cy.contains('.cvat-job-item-stage', 'Stage').click().trigger('mouseout');
            cy.get('.cvat-job-item-stage').each((element) => {
                sortStage.push(element.text());
            }).then(() => {
                expect(sortStage).to.deep.equal(['Stage', 'annotation', 'annotation', 'validation']);
            });
        });

        it('Sorting jobs by state.', () => {
            const sortState = [];
            cy.contains('.cvat-job-item-state', 'State').click().trigger('mouseout');
            cy.get('.cvat-job-item-state').each((element) => {
                sortState.push(element.text());
            }).then(() => {
                expect(sortState).to.deep.equal(['State', 'completed', 'new', 'new']);
            });
        });

        it('Sorting jobs by assignee.', () => {
            const sortAssignee = [];
            cy.contains('.cvat-job-item-assignee', 'Assignee').click().trigger('mouseout');
            cy.get('.cvat-job-item-assignee').find('[type="search"]').each((element) => {
                sortAssignee.push(element.val());
            }).then(() => {
                expect(sortAssignee).to.deep.equal([secondUserName, secondUserName, '']);
            });
        });
    });
});
