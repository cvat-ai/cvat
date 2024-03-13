// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
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
            cy.get('.cvat-job-item').then(($jobsTableRows) => {
                expect($jobsTableRows.length).to.be.equal(expectedCount);
            });
        } else {
            cy.get('.cvat-job-item').should('not.exist');
        }
    }

    function checkContentsRow(index, stage, state, assignee) {
        cy.getJobIDFromIdx(index).then(($job) => {
            cy.get('.cvat-task-job-list')
                .contains('a', `Job #${$job}`)
                .parents('.cvat-job-item').within(() => {
                    cy.get('.cvat-job-item-stage .ant-select-selection-item').should('have.text', stage);
                    cy.get('.cvat-job-item-state').should('have.text', state);
                    cy.get('.cvat-job-assignee-selector')
                        .find('input')
                        .invoke('val')
                        .should('equal', assignee);
                });
        });
    }

    function testSetJobFilter({ column, menuItem, reset }) {
        if (reset) {
            cy.contains('.cvat-clear-filters-button', 'Clear filters').click();
        } else {
            cy.contains('.cvat-switch-filters-constructor-button', 'Filter').click();
            cy.get('.cvat-resource-page-filters-builder').within(() => {
                cy.contains('button', 'Add rule').click();
                cy.contains('.ant-select-selector', 'Select field').should('be.visible');
                cy.contains('.ant-select-selector', 'Select field').get('input').last().type(`${column}{enter}`);
                cy.get('.ant-select-selector').last().get('input').last().type(`${menuItem}`);
                if (column !== 'Assignee') {
                    cy.get('.ant-select-selector').last().get('input').last().type('{enter}');
                }
            });

            if (column === 'Assignee') {
                cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').within(() => {
                    cy.get('.ant-select-item-option-content').contains(menuItem).click();
                });
            }

            cy.get('.cvat-resource-page-filters-builder').within(() => {
                cy.contains('button', 'Apply').click();
            });
        }
        cy.get('.cvat-resource-page-filters-builder').should('not.exist');
    }

    function testSetJobSorting({ column, reset }) {
        if (reset) {
            cy.contains('.cvat-switch-sort-constructor-button', 'Sort by').click();
            cy.contains('label', column).trigger('mousedown');
            cy.get('.cvat-resource-page-sorting-list').trigger('mousemove', 'bottom');
            cy.get('.cvat-resource-page-sorting-list').trigger('mouseup', 'bottom');
            cy.get('.cvat-jobs-list-filters-wrapper').click();
        } else {
            cy.contains('.cvat-switch-sort-constructor-button', 'Sort by').click();
            cy.contains('label', column).trigger('mousedown');
            cy.get('.cvat-resource-page-sorting-list').trigger('mousemove', 'top');
            cy.get('.cvat-resource-page-sorting-list').trigger('mouseup', 'top');
            cy.get('.cvat-jobs-list-filters-wrapper').click();
        }
        cy.get('.cvat-resource-page-sorting-list').should('not.exist');
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
        cy.getJobIDFromIdx(0).then((jobID) => cy.assignJobToUser(jobID, secondUserName));
        cy.getJobIDFromIdx(1).then((jobID) => cy.assignJobToUser(jobID, secondUserName));

        // The first job - stage "validation"
        cy.getJobIDFromIdx(0).then((jobID) => cy.setJobStage(jobID, 'validation'));

        // The second job - status "completed"
        cy.openJob(1);
        cy.setJobState('completed');
        cy.interactMenu('Open the task');
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
            checkContentsRow(0, 'validation', 'New', secondUserName); // The 1st job
            checkContentsRow(1, 'annotation', 'Completed', secondUserName); // The 2nd job
            checkContentsRow(2, 'annotation', 'New', ''); // The 3th job
        });

        it('Filtering jobs by stage (annotation, validation, acceptance).', () => {
            testSetJobFilter({ column: 'Stage', menuItem: 'annotation' });
            checkJobsTableRowCount(2);
            testSetJobFilter({ reset: true });
            testSetJobFilter({ column: 'Stage', menuItem: 'validation' });
            checkJobsTableRowCount(1);
            testSetJobFilter({ reset: true });
            testSetJobFilter({ column: 'Stage', menuItem: 'acceptance' });
            checkJobsTableRowCount(0);
            testSetJobFilter({ reset: true });
        });

        it('Filtering jobs by assignee.', () => {
            testSetJobFilter({ column: 'Assignee', menuItem: secondUserName });
            checkJobsTableRowCount(2);
            testSetJobFilter({ reset: true });
            checkJobsTableRowCount(3);
        });

        it('Filtering jobs by state (in progress, rejected, completed, new)', () => {
            testSetJobFilter({ column: 'State', menuItem: 'in progress' });
            checkJobsTableRowCount(0);
            testSetJobFilter({ reset: true });
            testSetJobFilter({ column: 'State', menuItem: 'rejected' });
            checkJobsTableRowCount(0);
            testSetJobFilter({ reset: true });
            testSetJobFilter({ column: 'State', menuItem: 'completed' });
            checkJobsTableRowCount(1);
            testSetJobFilter({ reset: true });
            testSetJobFilter({ column: 'State', menuItem: 'new' });
            checkJobsTableRowCount(2);
            testSetJobFilter({ reset: true });
            checkJobsTableRowCount(3);
        });

        it('Filtering jobs by validation, new, assignee to user.', () => {
            testSetJobFilter({ column: 'Stage', menuItem: 'validation' });
            checkJobsTableRowCount(1);
            testSetJobFilter({ column: 'State', menuItem: 'new' });
            checkJobsTableRowCount(1);
            testSetJobFilter({ column: 'Assignee', menuItem: secondUserName });
            checkJobsTableRowCount(1);
            checkContentsRow(0, 'validation', 'New', secondUserName);
            testSetJobFilter({ reset: true });
            checkJobsTableRowCount(3);
        });

        it('Sorting jobs by stage.', () => {
            const sortStage = [];
            testSetJobSorting({ column: 'Stage' });
            cy.get('.cvat-job-item-stage').each((element) => {
                sortStage.push(element.text());
            });
            cy.get('.cvat-job-item-stage').then(() => {
                expect(sortStage).to.deep.equal(['annotation', 'annotation', 'validation']);
            });
            testSetJobSorting({ column: 'Stage', reset: true });
        });

        it('Sorting jobs by state.', () => {
            const sortState = [];
            testSetJobSorting({ column: 'State' });
            cy.get('.cvat-job-item-state').each((element) => {
                sortState.push(element.text());
            });
            cy.get('.cvat-job-item-state').then(() => {
                expect(sortState).to.deep.equal(['Completed', 'New', 'New']);
            });
            testSetJobSorting({ column: 'State', reset: true });
        });

        it('Sorting jobs by assignee.', () => {
            const sortAssignee = [];
            testSetJobSorting({ column: 'Assignee' });
            cy.get('.cvat-job-assignee-selector').find('input').each((element) => {
                sortAssignee.push(element.val());
            });
            cy.get('.cvat-job-assignee-selector').find('input').then(() => {
                expect(sortAssignee).to.deep.equal([secondUserName, secondUserName, '']);
            });
        });
    });
});
