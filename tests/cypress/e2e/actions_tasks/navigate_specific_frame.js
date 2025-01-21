// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Paste labels from one task to another.', { browser: '!firefox' }, () => {
    const task = {
        name: 'Test "Continue/open frame N"',
        label: 'Test label',
        attrName: 'Test attribute',
        attrValue: 'Test attribute value',
    };

    const imagesCount = 3;
    const imageFileName = `image_${task.name.replace(' ', '_').toLowerCase()}`;
    const width = 100;
    const height = 100;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, task.name, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.goToTaskList();
        cy.createAnnotationTask(task.name, task.label, task.attrName, task.attrValue, archiveName);
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((authKey) => {
            cy.deleteTasks(authKey, [task.name, task.nameSecond]);
        });
    });

    describe('Test "Continue frame N"', () => {
        it('Open job, go to the 3rd frame, close task, reopen, notification exists.', () => {
            cy.openTaskJob(task.name);
            cy.checkFrameNum(0);
            cy.goCheckFrameNumber(2);
            cy.goToTaskList();
            cy.openTaskJob(task.name);
            cy.get('.cvat-notification-continue-job').should('exist');
        });

        it('Pressing continue button should navigate to the latest opened frame', () => {
            cy.get('.cvat-notification-continue-job-button').click();
            cy.checkFrameNum(2);
        });

        it('Trying to open a frame using query parameter', () => {
            cy.url().then(($url) => {
                cy.visit('/projects');
                cy.get('.cvat-projects-page').should('exist');
                cy.visit($url, { qs: { frame: 2 } });
                cy.get('.cvat-canvas-container').should('exist').and('be.visible');
                cy.checkFrameNum(2);
            });
        });
    });
});
