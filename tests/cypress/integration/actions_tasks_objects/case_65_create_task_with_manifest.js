// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Create and delete a annotation task', () => {
    const caseId = '65';
    const labelName = `Case ${caseId}`;
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
    const manifestName = 'manifest.jsonl';
    const manifestPath = `${__dirname}/assets/${manifestName}`;

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.readFile(manifestPath).then(($manifest) => {
            cy.writeFile(`${directoryToArchive}/${manifestName}`, $manifest);
        });
        cy.createZipArchive(directoryToArchive, archivePath);
    });

    describe(`Testing "${labelName}"`, () => {
        it('Create a task', () => {
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        });
    });
});
