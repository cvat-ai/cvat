// Copyright (C) 2022 Intel Corporation
// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Task status updated after initial save.', () => {
    const labelName = 'car';
    const taskName = 'Test task status updated after initial save';
    const attrName = 'Dummy attribute';
    const textDefaultValue = 'Test';
    const imagesCount = 1;
    const imageFileName = `image_${labelName}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const rectangleData = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
    });

    after(() => {
        cy.deleteTask(taskName);
    });

    afterEach(() => {
        cy.goToTaskList();
    });

    describe(`Testing "${labelName}"`, () => {
        it('State of the created task should be "new".', () => {
            cy.openTask(taskName);
            cy.get('.cvat-job-item .cvat-job-item-state').invoke('text').should('equal', 'New');
        });

        it('Create object, save annotation, state should be "in progress"', () => {
            cy.openTaskJob(taskName);
            cy.createRectangle(rectangleData);
            cy.saveJob();
            cy.interactMenu('Open the task');
            cy.get('.cvat-job-item .cvat-job-item-state').invoke('text').should('equal', 'In progress');
        });
    });
});
