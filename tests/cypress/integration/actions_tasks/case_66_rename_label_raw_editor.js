// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Rename a label via raw editor.', () => {
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
    let rawLabelsValue = '';

    function testChangingRawLabelsViewerText(rawLabelsTextarea) {
        const labels = JSON.parse(rawLabelsTextarea.text());
        labels.forEach((label) => {
            if (label.name === labelName) {
                label.name = newlabelName;
                label.color = newlabelColor;
            }
        });
        cy.get('.cvat-raw-labels-viewer').clear().type(JSON.stringify(labels), { parseSpecialCharSequences: false });
    }

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
            cy.get('.cvat-raw-labels-viewer').then(($rawLabelsTextarea) => {
                rawLabelsValue = $rawLabelsTextarea.text();
                testChangingRawLabelsViewerText($rawLabelsTextarea);
            });
            cy.contains('[type="button"]', 'Reset').click();
        });

        it('After reset, the text of the element returned to its original value.', () => {
            cy.get('.cvat-raw-labels-viewer').then(($rawLabelsTextareaAfterReset) => {
                expect(rawLabelsValue).to.be.equal($rawLabelsTextareaAfterReset.text());
            });
        });

        it('Change label name, color by raw editor. Press "Done". The label parameters have taken on new values.', () => {
            cy.get('.cvat-raw-labels-viewer').then(($rawLabelsTextarea) => {
                testChangingRawLabelsViewerText($rawLabelsTextarea);
            });
            cy.contains('[type="submit"]', 'Done').click();
            cy.contains('[role="tab"]', 'Constructor').click();
            cy.get('.cvat-constructor-viewer-item')
                .should('have.text', newlabelName)
                .and('have.attr', 'style')
                .and('contain', 'rgb(193, 67, 48)');
        });
    });
});
