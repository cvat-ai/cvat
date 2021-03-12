// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Rename a task.', () => {
    const caseId = '39';
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
    const newNaskName = taskName.replace('39', '3339');
    const secondUserName = 'Case39';
    const secondUser = {
        firstName: `Firtstnamerenametask`,
        lastName: `Lastnamerenametask`,
        emailAddr: `${secondUserName.toLowerCase()}@local.local`,
        password: 'Pass!UserCase39',
    };

    function renameTask(taskName, newValue) {
        cy.get('.cvat-task-details-task-name').within(() => {
            cy.get('[aria-label="edit"]').click();
        });
        cy.contains('.cvat-text-color', taskName).click().type(newValue);
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
    });

    after(() => {
        cy.deletingRegisteredUsers([secondUserName]);
        cy.login();
        cy.deleteTask(newNaskName);
    });

    describe(`Testing "${labelName}". Issue 2572.`, () => {
        it('Rename the task. Issue is not reproduce.', () => {
            renameTask(taskName, '{leftarrow}{leftarrow}33{Enter}');
            cy.contains('.cvat-task-details-task-name', newNaskName).should('exist');
            cy.logout();
        });
        it('Registration a second user. Rename the task. Status 403 appear.', () => {
            cy.goToRegisterPage();
            cy.userRegistration(
                secondUser.firstName,
                secondUser.lastName,
                secondUserName,
                secondUser.emailAddr,
                secondUser.password,
            );
            cy.openTask(newNaskName);
            renameTask(newNaskName, '{leftarrow}{leftarrow}3{Enter}');
            cy.get('.cvat-notification-notice-update-task-failed').should('exist');
            cy.closeNotification('.cvat-notification-notice-update-task-failed');
            cy.logout(secondUserName);
        });
    });
});
