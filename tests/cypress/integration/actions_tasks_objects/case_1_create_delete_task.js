// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create and delete a annotation task', () => {
    const caseId = '1';
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

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
    });

    describe(`Testing "${labelName}"`, () => {
        it('Create a task', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        });

        it('Delete the created task', () => {
            cy.deleteTask(taskName);
        });
        it('Deleted task not exist', () => {
            cy.contains('strong', taskName)
                .parents('.cvat-tasks-list-item')
                .should('have.attr', 'style')
                .and('contain', 'pointer-events: none; opacity: 0.5;');
        });
    });
});
