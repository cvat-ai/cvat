// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

export const labelName = 'Main task';
export const taskName = `New annotation task for ${labelName}`;
export const attrName = `Attr for ${labelName}`;
export const textDefaultValue = 'Some default value for type Text';
export const imagesCount = 50;
export const imageFileName = `image_${labelName.replace(/\s+/g, '_').toLowerCase()}`;
export const width = 800;
export const height = 800;
export const posX = 10;
export const posY = 10;
export const color = 'gray';
export const archiveName = `${imageFileName}.zip`;
export const archivePath = `cypress/fixtures/${archiveName}`;
export const imagesFolder = `cypress/fixtures/${imageFileName}`;
export const directoryToArchive = imagesFolder;
export const advancedConfigurationParams = {
    multiJobs: true,
    segmentSize: 10,
    sssFrame: true,
    startFrame: 2,
    stopFrame: imagesCount,
    frameStep: 2,
};
export const multiAttrParams = {
    name: 'Attr 2',
    values: 'Attr value 2',
    type: 'Text',
};

it('Prepare to testing', () => {
    cy.visit('/auth/login');
    cy.login();
    cy.get('.cvat-tasks-page').should('exist');
    const listItems = [];
    cy.document().then((doc) => {
        const collection = Array.from(doc.querySelectorAll('.cvat-item-task-name'));
        for (let i = 0; i < collection.length; i++) {
            listItems.push(collection[i].innerText);
        }
        if (listItems.indexOf(taskName) === -1) {
            cy.task('log', "A task doesn't exist. Creating.");
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(directoryToArchive, archivePath);
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                archiveName,
                multiAttrParams,
                advancedConfigurationParams,
            );
        } else {
            cy.task('log', 'The task exist. Skipping creation.');
        }
    });
});
