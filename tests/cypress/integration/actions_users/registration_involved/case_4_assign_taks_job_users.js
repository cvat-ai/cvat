// Copyright (C) 2020 Intel Corporation
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

    after(() => {
        cy.login();
        cy.getTaskID(taskName).then(($taskID) => {
            cy.deleteTask(taskName, $taskID);
        });
    });

    describe(`Testing case "${caseId}"`, () => {
        // First user is "admin".
        it('Register second user and logout.', () => {
            cy.visit('auth/register');
            cy.url().should('include', '/auth/register');
            cy.userRegistration(
                secondUser.firstName,
                secondUser.lastName,
                secondUserName,
                secondUser.emailAddr,
                secondUser.password,
            );
            cy.url().should('include', '/tasks');
            cy.logout(secondUserName);
            cy.url().should('include', '/auth/login');
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
            cy.url().should('include', '/tasks');
            cy.logout(thirdUserName);
            cy.url().should('include', '/auth/login');
        });
        it('First user login and create a task', () => {
            cy.login();
            cy.url().should('include', '/tasks');
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        });
        it('Assign the task to the second user and logout', () => {
            cy.openTask(taskName);
            cy.get('.cvat-task-details').within(() => {
                cy.get('.cvat-user-search-field').click({ force: true });
            });
            cy.contains(secondUserName).click();
            cy.logout();
        });
        it('Second user login. The task can be opened. Logout', () => {
            cy.login(secondUserName, secondUser.password);
            cy.url().should('include', '/tasks');
            cy.get('[value="tasks"]').click();
            cy.contains('strong', taskName).should('exist');
            cy.openTask(taskName);
            cy.logout(secondUserName);
        });
        it('Third user login. The task not exist. Logout', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.url().should('include', '/tasks');
            cy.get('[value="tasks"]').click();
            cy.contains('strong', taskName).should('not.exist');
            cy.logout(thirdUserName);
        });
        it('First user login and assign the job to the third user. Logout', () => {
            cy.login();
            cy.url().should('include', '/tasks');
            cy.get('[value="tasks"]').click();
            cy.openTask(taskName);
            cy.get('.cvat-task-job-list').within(() => {
                cy.get('.cvat-user-search-field').click({ force: true });
            });
            cy.contains(thirdUserName).click();
            cy.logout();
        });
        it('Third user login. The task can be opened.', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.url().should('include', '/tasks');
            cy.get('[value="tasks"]').click();
            cy.contains('strong', taskName).should('exist');
            cy.openTask(taskName);
            cy.logout(thirdUserName);
        });
    });
});
