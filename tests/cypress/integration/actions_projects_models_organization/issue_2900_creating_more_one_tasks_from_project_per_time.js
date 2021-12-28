// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName, labelName } from '../../support/const_project';

context('Create more than one task per time when create from project.', () => {
    const issueID = 2900;
    const taskName = {
        firstTask: `First task for ${projectName}`,
        secondTask: `Second task for ${projectName}`,
    };
    const imagesCount = 1;
    const imageFileName = `image_${taskName.firstTask.replace(/\s+/g, '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'white';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;

    function createTask(nameTaskToCreate) {
        cy.get('[id="name"]').clear().type(nameTaskToCreate);
        cy.get('.cvat-project-search-field').within(() => {
            cy.get('[type="search"]').should('have.value', projectName);
        });
        cy.get('.cvat-constructor-viewer-new-item').should('not.exist');
        cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });
        cy.contains('button', 'Submit').click();
        cy.get('.cvat-notification-create-task-success').should('exist');
        cy.get('.cvat-notification-create-task-fail').should('not.exist');
    }

    before(() => {
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.openProject(projectName);
    });

    describe(`Testing "Issue ${issueID}"`, () => {
        it('Create more than one task per time from project.', () => {
            cy.get('#cvat-create-task-button').click();
            createTask(taskName.firstTask);
            createTask(taskName.secondTask);
        });

        it('The tasks successfully created. Remove the project.', () => {
            cy.goToProjectsList();
            cy.openProject(projectName);
            cy.contains('.cvat-item-task-name', taskName.firstTask).should('exist').and('be.visible');
            cy.contains('.cvat-item-task-name', taskName.secondTask).should('exist').and('be.visible');
            cy.deleteProjectViaActions(projectName);
        });
    });
});
