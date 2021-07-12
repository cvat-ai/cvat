// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Move a task to a project.', () => {
    const caseID = '95';
    const task = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrValue: 'Oak',
    }

    const project = {
        name: `Case ${caseID}`,
        label: 'Tree',
        attrName: 'Kind',
        attrVaue: 'Oak'
    }

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

    before(() => {
        cy.visit('/');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, task.name, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
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
            cy.goToProjectsList();
            cy.openProject(project.name);
            cy.get('.cvat-tasks-list-item').should('exist');
        });

        it('Move a task from task.', () => {
            cy.openProject(project.name);
            cy.get('.cvat-tasks-list-item').should('not.exist');
            cy.goToTaskList();
            cy.openTask(task.name);
            cy.movingTask(task.name, project.name, task.label, project.label, true);
            cy.goToProjectsList();
            cy.openProject(project.name);
            cy.get('.cvat-tasks-list-item').should('exist');
        });
    });
});
