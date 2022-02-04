// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Delete a label from a task.', () => {
    const labelName = 'car';
    const taskName = 'Test correct state changing on first annotations save';
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
        cy.openTask(taskName);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing "${labelName}"`, () => {
        it('State of the created task should be "new".', () => {
            cy.get('td.cvat-job-item-state').invoke('text').should('equal', 'new');
        });

        it('Create object, save annotation, state should be "in progress"', () => {
            cy.openJob();
            cy.createRectangle(rectangleData);
            cy.saveJob();
            cy.interactMenu('Open the task');
            cy.reload();
            cy.get('td.cvat-job-item-state').invoke('text').should('equal', 'in progress');
        });
    });
});
