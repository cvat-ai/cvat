// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Cannot read property label of undefined', () => {
    const issueId = '1823';
    const labelName = `Issue ${issueId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 10;
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
    const advancedConfigurationParams = {
        chunkSize: 1,
    };

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
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
    });

    after(() => {
        cy.goToTaskList();
        cy.getTaskID(taskName).then(($taskID) => {
            cy.deleteTask(taskName, $taskID);
        });
    });

    describe(`Testing "${labelName}"`, () => {
        it('Create a task with chunk size === 1. Open the task.', () => {
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                null,
                advancedConfigurationParams,
            );
            cy.openTaskJob(taskName);
        });
        it('Create a shape on the first frame.', () => {
            cy.createRectangle(createRectangleShape2Points);
        });
        it('Go to another frame. During this procedure open context menu for a shape.', () => {
            cy.get('body').type('f');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove').rightclick();
        });
        it('Page with the error is missing', () => {
            cy.get('.cvat-global-boundary').should('not.exist');
        });
    });
});
