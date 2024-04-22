// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
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
    const newTaskName = taskName.replace('39', '3339');
    const newTaskNameSecondUser = newTaskName.replace('3339', '33339');
    const secondUserName = 'Case39';
    const secondUser = {
        firstName: 'Firtstnamerenametask',
        lastName: 'Lastnamerenametask',
        emailAddr: `${secondUserName.toLowerCase()}@local.local`,
        password: 'Pass!UserCase39',
    };

    function renameTask(myTaskName, newValue) {
        cy.get('.cvat-task-details-task-name').within(() => {
            cy.get('[aria-label="edit"]').click();
        });
        cy.contains('.cvat-text-color', myTaskName).click();
        cy.contains('.cvat-text-color', myTaskName).type(newValue);
        cy.get('.cvat-spinner').should('not.exist');
    }

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.visit('auth/register');
        cy.userRegistration(
            secondUser.firstName,
            secondUser.lastName,
            secondUserName,
            secondUser.emailAddr,
            secondUser.password,
        );
        cy.logout();
        cy.login();
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteUsers(authKey, [secondUserName]);
            cy.deleteTasks(authKey, [newTaskNameSecondUser]);
        });
    });

    describe(`Testing "${labelName}". Issue 2572.`, () => {
        it('The admin tries to rename the task and assigns to the second user. Issue is not reproduce.', () => {
            renameTask(taskName, '{leftarrow}{leftarrow}33{Enter}');
            cy.contains('.cvat-task-details-task-name', newTaskName).should('exist');
            cy.assignTaskToUser(secondUserName);
            cy.logout();
        });

        it('The second user tries to rename the task. Success.', () => {
            cy.login(secondUserName, secondUser.password);
            cy.openTask(newTaskName);
            cy.renameTask(newTaskName, newTaskNameSecondUser);
        });
    });
});
