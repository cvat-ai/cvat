// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Multiple users. Assign task, job. Deactivating users.', () => {
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

    let authKey;
    const isStaff = false;
    const isSuperuser = false;
    const isActive = false;

    function changeCheckUserStatusOpenTask(userName) {
        cy.changeUserActiveStatus(authKey, userName, isActive);
        cy.checkUserStatuses(authKey, userName, isStaff, isSuperuser, isActive);
        cy.intercept('GET', `/api/v1/users*${thirdUserName}*`).as('users');
        cy.openTask(taskName);
        cy.wait('@users');
        cy.get('.cvat-global-boundary').should('not.exist');
        cy.contains('.cvat-task-details-task-name', taskName).should('exist');
    }


    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
    });

    after(() => {
        cy.logout();
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

        it('First user login. Getting authKey.', () => {
            cy.visit('/');
            cy.intercept('POST', '/api/v1/auth/login').as('login');
            cy.login();
            cy.wait('@login').then((response) => {
                authKey = response['response']['body']['key'];
            });
        });

        it('Deactivate the second user (task assigned). Trying to open the task. Should be succefull.', () => {
            changeCheckUserStatusOpenTask(secondUserName);
            cy.goToTaskList();
        });

        it('Deactivate the third user (job assigned). Trying to open the task. Should be succefull.', () => {
            changeCheckUserStatusOpenTask(thirdUserName);
        });
    });
});
