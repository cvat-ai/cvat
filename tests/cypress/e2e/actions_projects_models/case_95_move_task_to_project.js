// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

// Temporarily disabling the test for Firefox browser
// Cypress issue: https://github.com/cypress-io/cypress/issues/18325

context('Move a task to a project.', { browser: '!firefox' }, () => {
    const caseID = '95';
    const task = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrValue: 'Oak',
        nameSecond: `Case ${caseID} second`,
        labelSecond: 'Tree',
        attrNameSecond: 'Kind',
        attrValueSecond: 'Oak',
        name3d: `Case ${caseID} 3D`,
        label3d: 'Bus',
        attrName3d: 'Type',
        attrValue3d: 'City bus',
    };

    const project = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrVaue: 'Oak',
    };

    const imagesCount = 1;
    const imageFileName = `image_${task.name.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archiveName3d = '../../cypress/e2e/canvas3d_functionality/assets/test_canvas3d.zip';
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, task.name, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.goToTaskList();
        cy.createAnnotationTask(
            task.nameSecond, task.labelSecond, task.attrNameSecond, task.attrValueSecond, archiveName,
        );
        cy.createAnnotationTask(task.name3d, task.label3d, task.attrName3d, task.attrValue3d, archiveName3d);
    });

    beforeEach(() => {
        cy.goToTaskList();
        cy.createAnnotationTask(task.name, task.label, task.attrName, task.attrValue, archiveName);
        cy.goToProjectsList();
        cy.createProjects(project.name, project.label, project.attrName, project.attrVaue);
    });

    afterEach(() => {
        cy.goToProjectsList();
        cy.openProject(project.name);
        cy.deleteProjectViaActions(project.name);
    });

    describe(`Testing "Case ${caseID}"`, () => {
        it('Move a task from task list.', () => {
            cy.openProject(project.name);
            cy.get('.cvat-tasks-list-item').should('not.exist');
            cy.goToTaskList();
            cy.movingTask(task.name, project.name, task.label, project.label);
            // Check issue 3403
            cy.goToTaskList();
            cy.movingTask(task.nameSecond, project.name, task.labelSecond, project.label);
            cy.goToProjectsList();
            cy.openProject(project.name);
            cy.get('.cvat-tasks-list-item').should('exist').and('have.length', 2);
        });

        it('Move a task from task. Attempt to add a 3D task to a project with a 2D task.', () => {
            cy.openProject(project.name);
            cy.get('.cvat-tasks-list-item').should('not.exist');
            cy.goToTaskList();
            cy.openTask(task.name);
            cy.movingTask(task.name, project.name, task.label, project.label, true);
            cy.goToTaskList();
            cy.movingTask(task.name3d, project.name, task.label3d, project.label);
            cy.get('.cvat-notification-notice-update-task-failed').should('be.visible');
            cy.closeNotification('.cvat-notification-notice-update-task-failed');
            cy.goToProjectsList();
            cy.openProject(project.name);
            cy.get('.cvat-tasks-list-item').should('exist').and('have.length', 1);
        });
    });
});
