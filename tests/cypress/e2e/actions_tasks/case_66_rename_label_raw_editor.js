// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
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
    let updatedRawLabelsValue = '';

    function testChangingRawLabelsViewerText(rawLabelsTextarea) {
        const labels = JSON.parse(rawLabelsTextarea.text());
        labels.forEach((label) => {
            if (label.name === labelName) {
                // eslint-disable-next-line no-param-reassign
                label.name = newlabelName;
                // eslint-disable-next-line no-param-reassign
                label.color = newlabelColor;
            }
        });
        updatedRawLabelsValue = JSON.stringify(labels);
        cy.get('.cvat-raw-labels-viewer').clear();
        cy.get('.cvat-raw-labels-viewer').type(updatedRawLabelsValue, { parseSpecialCharSequences: false });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
        cy.addNewLabel({ name: labelName });
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Change label name, color by raw editor. Press "Cancel". The values returned to their original values.', () => {
            cy.contains('[role="tab"]', 'Raw').click();
            cy.get('.cvat-submit-raw-labels-conf-button').should('be.disabled');
            cy.get('.cvat-reset-raw-labels-conf-button').should('be.disabled');
            cy.get('.cvat-raw-labels-viewer').then(($rawLabelsTextarea) => {
                rawLabelsValue = $rawLabelsTextarea.text();
                testChangingRawLabelsViewerText($rawLabelsTextarea);
            });
            cy.get('.cvat-submit-raw-labels-conf-button').should('not.be.disabled');
            cy.get('.cvat-reset-raw-labels-conf-button').should('not.be.disabled');
            cy.get('.cvat-reset-raw-labels-conf-button').click();
            cy.get('.cvat-submit-raw-labels-conf-button').should('be.disabled');
            cy.get('.cvat-reset-raw-labels-conf-button').should('be.disabled');
        });

        it('Invalid JSON disables Save, while Cancel restores the original value.', () => {
            cy.get('.cvat-raw-labels-viewer').then(($rawLabelsTextareaAfterReset) => {
                expect(rawLabelsValue).to.be.equal($rawLabelsTextareaAfterReset.text());
            });
            cy.get('.cvat-raw-labels-viewer').clear();
            cy.get('.cvat-raw-labels-viewer').type('{');
            cy.get('.cvat-submit-raw-labels-conf-button').should('be.disabled');
            cy.get('.cvat-reset-raw-labels-conf-button').should('not.be.disabled');
            cy.get('.cvat-reset-raw-labels-conf-button').click();
            cy.get('.cvat-raw-labels-viewer').should('have.value', rawLabelsValue);
        });

        it('Change label name, color by raw editor. Press "Save". The label parameters have taken on new values.', () => {
            cy.intercept('PATCH', '/api/labels/**', (request) => {
                request.continue((response) => {
                    response.setDelay(1000);
                });
            }).as('updateLabel');
            cy.get('.cvat-raw-labels-viewer').then(($rawLabelsTextarea) => {
                testChangingRawLabelsViewerText($rawLabelsTextarea);
            });
            cy.get('.cvat-submit-raw-labels-conf-button').should('not.be.disabled');
            cy.get('.cvat-submit-raw-labels-conf-button').click();
            cy.get('.cvat-submit-raw-labels-conf-button')
                .should('be.disabled')
                .and('have.class', 'ant-btn-loading');
            cy.get('.cvat-reset-raw-labels-conf-button').should('not.be.disabled');
            cy.get('.cvat-raw-labels-viewer').should('have.value', updatedRawLabelsValue);
            cy.wait('@updateLabel');
            cy.get('.cvat-submit-raw-labels-conf-button').should('be.disabled');
            cy.get('.cvat-reset-raw-labels-conf-button').should('be.disabled');
            cy.contains('[role="tab"]', 'Constructor').click();
            cy.get('.cvat-constructor-viewer-item')
                .should('have.text', newlabelName)
                .and('have.attr', 'style')
                .and('contain', 'rgb(193, 67, 48)');
        });
    });
});
