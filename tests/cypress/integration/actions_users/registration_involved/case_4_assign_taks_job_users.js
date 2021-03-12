// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Multiple users. Assign task, job.', () => {
    const caseId = '4';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 1;
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
    const secondUserName = 'Seconduser';
    const thirdUserName = 'Thirduser';

    const secondUser = {
        firstName: `${secondUserName} fitstname`,
        lastName: `${secondUserName} lastname`,
        emailAddr: `${secondUserName.toLowerCase()}@local.local`,
        password: 'UfdU21!dds',
    };
    const thirdUser = {
        firstName: `${thirdUserName} fitstname`,
        lastName: `${thirdUserName} lastname`,
        emailAddr: `${thirdUserName.toLowerCase()}@local.local`,
        password: 'Fv5Df3#f55g',
    };

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
    });

    after(() => {
        cy.deletingRegisteredUsers([secondUserName, thirdUserName]);
        cy.login();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        // First user is "admin".
        it('Register second user, tries to create task and logout.', () => {
            cy.visit('auth/register');
            cy.url().should('include', '/auth/register');
            cy.userRegistration(
                secondUser.firstName,
                secondUser.lastName,
                secondUserName,
                secondUser.emailAddr,
                secondUser.password,
            );
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                null,
                null,
                false,
                false,
                null,
                'fail',
            );
            cy.closeNotification('.cvat-notification-notice-create-task-failed');
            cy.contains('.cvat-item-task-name', `${taskName}`).should('not.exist');
            cy.logout(secondUserName);
        });
        it('Register third user and logout.', () => {
            cy.get('a[href="/auth/register"]').click();
            cy.url().should('include', '/auth/register');
            cy.userRegistration(
                thirdUser.firstName,
                thirdUser.lastName,
                thirdUserName,
                thirdUser.emailAddr,
                thirdUser.password,
            );
            cy.logout(thirdUserName);
        });
        it('First user login, create a task and logout', () => {
            cy.login();
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
            cy.logout();
        });
        it('Second user login, tries to add label and logout', () => {
            cy.login(secondUserName, secondUser.password);
            cy.openTask(taskName);
            cy.addNewLabel('failAddLabel');
            cy.closeNotification('.cvat-notification-notice-update-task-failed');
            cy.contains('.cvat-constructor-viewer-item', 'failAddLabel').should('not.exist');
            cy.logout(secondUserName);
        });
        it('Assign the task to the second user and logout', () => {
            cy.login();
            cy.openTask(taskName);
            cy.assignTaskToUser(secondUserName);
            cy.logout();
        });
        it('Second user login. The task can be opened. Logout', () => {
            cy.login(secondUserName, secondUser.password);
            cy.contains('strong', taskName).should('exist');
            cy.openTask(taskName);
            cy.logout(secondUserName);
        });
        it('Third user login. The task not exist. Logout', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.contains('strong', taskName).should('not.exist');
            cy.logout(thirdUserName);
        });
        it('First user login and assign the job to the third user. Logout', () => {
            cy.login();
            cy.openTask(taskName);
            cy.assignJobToUser(0, thirdUserName);
            cy.logout();
        });
        it('Third user login. Tries to delete task. The task can be opened.', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.contains('strong', taskName).should('exist');
            cy.deleteTask(taskName);
            cy.closeNotification('.cvat-notification-notice-delete-task-failed');
            cy.openTask(taskName);
            cy.logout(thirdUserName);
        });
    });
});
