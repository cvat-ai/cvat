// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Multiple users. Assign task, job. Deactivating users.', () => {
    const caseId = '4';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const secondTaskName = `${taskName} second`;
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
    let taskID;
    let jobID;

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
        cy.intercept('GET', `/api/users*${thirdUserName}*`).as('users');
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
        cy.getAuthKey().then(($authKey) => {
            cy.deleteUsers($authKey, [secondUserName, thirdUserName]);
            cy.deleteTasks($authKey, [taskName, secondTaskName]);
        });
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
                secondTaskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                null,
                null,
                false,
                false,
                null,
                'success',
            );
            cy.contains('.cvat-item-task-name', secondTaskName).should('exist');
            cy.logout(secondUserName);
        });

        it('Register third user and logout.', () => {
            cy.goToRegisterPage();
            cy.userRegistration(
                thirdUser.firstName,
                thirdUser.lastName,
                thirdUserName,
                thirdUser.emailAddr,
                thirdUser.password,
            );
            cy.logout(thirdUserName);
        });

        it('First user login, create a task, assign the task to the second user and logout.', () => {
            cy.login();
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
            cy.goToTaskList();
            cy.openTask(taskName);
            cy.assignTaskToUser(secondUserName);
            cy.openJob();
            // Getting the task and job id
            cy.url().then((url) => {
                jobID = Number(url.split('/').slice(-1)[0]);
                taskID = Number(url.split('/').slice(-3)[0]);
            });
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

        it('The third user can open a job by a direct link.', () => {
            cy.login(thirdUserName, thirdUser.password);
            cy.get('.cvat-item-task-name').should('not.exist');
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist');

            // Check issue "Info modal does not work if a job assigneed to somebody (4140)"
            cy.contains('.cvat-annotation-header-button', 'Info').click();
            cy.get('.cvat-job-info-modal-window').should('be.visible');
            cy.contains('[type="button"]', 'OK').click();
            cy.get('.cvat-job-info-modal-window').should('not.be.visible');

            cy.logout(thirdUserName);
        });

        it('First user login. Getting authKey.', () => {
            cy.visit('/');
            cy.intercept('POST', '/api/auth/login**').as('login');
            cy.login();
            cy.wait('@login').then((response) => {
                authKey = response.response.body.key;
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
