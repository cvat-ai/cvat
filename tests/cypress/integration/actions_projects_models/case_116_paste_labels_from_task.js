// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

// The test is disabled for Firefox because the "Cypress Real Events" plugin work only in the chromium-based browser.
context('Paste labels from another task.', { browser: '!firefox' }, () => {
    const caseID = '116';
    const task = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrValue: 'Oak',
    };

    const projectName = `Case ${caseID}`;

    const imagesCount = 1;
    const imageFileName = `image_${task.name.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    let projectID = '';

    function getProjectID() {
        cy.url().then((url) => {
            projectID = Number(url.split('/').slice(-1)[0].split('?')[0]);
        });
    }

    before(() => {
        cy.visit('/');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, task.name, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.goToTaskList();
        cy.createAnnotationTask(task.name, task.label, task.attrName, task.attrValue, archiveName);
    });

    after(() => {
        cy.goToProjectsList();
        cy.deleteProject(projectName, projectID);
        cy.goToTaskList();
        cy.deleteTask(task.name);
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Copying a label from a task via the raw editor.', () => {
            cy.openTask(task.name);
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer')
                .focus()
                .realPress(['ControlLeft', 'a'])
                .realPress(['ControlLeft', 'c']);
        });

        it('Creating a project with copying labels from the task.', () => {
            cy.goToProjectsList();
            cy.get('.cvat-create-project-button').click();
            cy.get('#name').type(projectName);
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer')
                .focus()
                .clear()
                .realPress(['ControlLeft', 'v']);
            cy.get('.cvat-raw-labels-viewer').then((raw) => {
                expect(raw.text()).not.contain('"id":');
            });
            cy.contains('button', 'Done').click();
            cy.contains('[role="tab"]', 'Constructor').click();
            cy.contains('.cvat-constructor-viewer-item', task.label).should('exist');
            cy.contains('button', 'Submit').click();
            cy.get('.cvat-notification-create-project-success').should('exist').find('[data-icon="close"]').click();
            cy.goToProjectsList();
            cy.openProject(projectName);
            getProjectID();
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer').then((raw) => {
                expect(raw.text()).contain('"id":');
            });
        });
    });
});
