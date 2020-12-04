// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const randomString = (string) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i <= 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return string ? `${result}${Math.floor(Math.random() * 10)}` : result;
};

context('Review pipeline feature', () => {
    const caseId = 'Review pipeline feature';
    const labelName = `Case ${caseId}`;
    const taskName = `${caseId}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 30;
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
        segmentSize: 10,
    };

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    const secondUserName = `${randomString()}`;
    const thirdUserName = `${randomString()}`;
    const firstName = `${randomString()}`;
    const lastName = `${randomString()}`;
    const emailAddrSecond = `${secondUserName}@local.local`;
    const emailAddrThird = `${thirdUserName}@local.local`;
    const passwordSecondUser = `${randomString(true)}`;
    const passwordThirdUser = `${randomString(true)}`;

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.visit('auth/register');
    });

    // after(() => {
    //     cy.goToTaskList();
    //     cy.getTaskID(taskName).then(($taskID) => {
    //         cy.deleteTask(taskName, $taskID);
    //     });
    // });

    describe(`Testing "${labelName}"`, () => {
        it('Registration of required users.', () => {
            cy.userRegistration(firstName, lastName, secondUserName, emailAddrSecond, passwordSecondUser);
            cy.logout(secondUserName);
            cy.goToRegisterPage();
            cy.userRegistration(firstName, lastName, thirdUserName, emailAddrThird, passwordThirdUser);
            cy.logout(thirdUserName);
        });

        it('First user login. Create a task. Open the task. Assign to himself.', () => {
            cy.login();
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                null,
                advancedConfigurationParams,
            );
            cy.openTask(taskName);
            cy.assignTaskToUser(Cypress.env('user'));
            cy.logout();
        });

        // it('Login the second, third user. The task is missing.', () => {
        //     cy.login(secondUserName, passwordSecondUser);
        //     cy.contains('.cvat-item-task-name', taskName).should('not.exist');
        //     cy.logout(secondUserName);
        //     cy.login(thirdUserName, passwordThirdUser);
        //     cy.contains('.cvat-item-task-name', taskName).should('not.exist');
        //     cy.logout(thirdUserName);
        // });

        it('First user login. Assign the first job to the second user.', () => {
            cy.login();
            cy.openTask(taskName);
            cy.assignJobToUser(0, secondUserName);
            cy.logout();
        });

        it('Second user login. Open the task, open the job and annotates it.', () => {
            cy.login(secondUserName, passwordSecondUser);
            cy.openTaskJob(taskName);
            for (let i = 1; i < 4; i++) {
                cy.createRectangle(createRectangleShape2Points);
                cy.goToNextFrame(i);
            }
        });

        it('Second user sends the job to review.', () => {
            cy.contains('.cvat-annotation-header-button', 'Menu').click();
            cy.get('.cvat-annotation-menu').within(() => {
                cy.contains('Request a review').click();
            });
            cy.contains('.ant-modal-content', 'The job has unsaved annotations')
                .should('exist')
                .within(() => {
                    cy.contains('[type="button"]', 'OK').click();
                });
            cy.contains('.ant-modal-content', 'Reviewer:')
                .should('exist')
                .within(() => {
                    cy.get('.cvat-user-search-field').click();
                });
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.contains(new RegExp(`^${thirdUserName}`, 'g')).click();
                });
            cy.contains('.ant-modal-content', 'Reviewer:').within(() => {
                cy.contains('[type="button"]', 'Submit').click();
            });
            cy.url().should('include', '/tasks');
            cy.contains('.cvat-task-details', taskName).should('exist');
        });
    });
});
