// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create an annotation task with manifest.', () => {
    const caseId = '66';
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
    const newlabelName = `Changed case ${caseId}`;
    const newlabelColor = '#C14330';
    let currentColor = '';

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
        cy.addNewLabel(labelName);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change label name, color by raw editor. Press "Reset". The values returned to their original values.', () => {
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-raw-labels-viewer').then(($rawViewer) => {
                const json = JSON.parse($rawViewer.text());
                json.forEach(($el) => {
                    if ($el.name === labelName) {
                        $el.name = newlabelName;
                        currentColor = $el.color;
                        $el.color = newlabelColor;
                    }
                });
                cy.get('.cvat-raw-labels-viewer')
                    .clear()
                    .type(JSON.stringify(json), { parseSpecialCharSequences: false });
                cy.contains('[type="button"]', 'Reset').click();
            });
            cy.get('.cvat-raw-labels-viewer').then(($rawViewer) => {
                const json = JSON.parse($rawViewer.text());
                json.forEach(($el) => {
                    if ($el.name === labelName) {
                        expect($el.name).to.be.equal(labelName);
                        expect($el.color).to.be.equal(currentColor);
                    }
                });
            });
        });

        it('Change label name, color by raw editor. Press "Done". The label parameters have taken on new values.', () => {
            cy.get('.cvat-raw-labels-viewer').then(($rawViewer) => {
                const json = JSON.parse($rawViewer.text());
                json.forEach(($el) => {
                    if ($el.name === labelName) {
                        $el.name = newlabelName;
                        $el.color = newlabelColor;
                    }
                });
                cy.get('.cvat-raw-labels-viewer')
                    .clear()
                    .type(JSON.stringify(json), { parseSpecialCharSequences: false });
            });
            cy.contains('[type="submit"]', 'Done').click();
            cy.contains('[role="tab"]', 'Constructor').click();
            cy.get('.cvat-constructor-viewer-item')
                .should('have.text', newlabelName)
                .and('have.css', 'background')
                .and('contain', 'rgb(193, 67, 48)');
        });
    });
});
