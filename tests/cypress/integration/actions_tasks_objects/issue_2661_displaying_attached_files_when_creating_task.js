// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Displaying attached files when creating a task.', () => {
    const issueId = '2661';
    const labelName = `Issue ${issueId}`;
    const imagesCount = 5;
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
    let imageListToAttach = [];
    for (let i = 1; i <= imagesCount; i++) {
        imageListToAttach.push(`${imageFileName}/${imageFileName}_${i}.png`);
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.get('#cvat-create-task-button').click();
    });

    describe(`Testing "${labelName}"`, () => {
        it('Attach a files. Attached files is visible.', () => {
            cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });
            cy.get('.cvat-file-manager-local-tab').should('contain', archiveName).and('be.visible');
        });

        it('Attach more then 4 files. Attached files is visible and contain text "<count_files> files selected".', () => {
            cy.get('input[type="file"]').attachFile(imageListToAttach, { subjectType: 'drag-n-drop' });
            cy.get('.cvat-file-manager-local-tab').should('contain', `${imagesCount} files selected`).and('be.visible');
        });
    });
});
