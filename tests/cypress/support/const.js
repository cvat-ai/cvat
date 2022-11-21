// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />
import { globalTheme as theme } from './theme';

export const testData = {
    image1: 'images/image_1.jpg',
    image2: 'images/image_2.jpg',
    image3: 'images/image_3.jpg',
};
export const nameTask = 'Basic actions with masks';
export const serverFiles = [`${testData.image1}`, `${testData.image2}`, `${testData.image3}`];
export const editingActions = [
    {
        method: `${theme.methodPolygonMinus}`,
        coordinates: [[50, 400], [800, 400], [800, 800], [50, 800]],
    },
];
export const drawingActions = [
    {
        method: `${theme.methodBrush}`,
        coordinates: [[300, 300], [700, 300], [700, 700], [300, 700]],
    },
    {
        method: `${theme.methodPolygonPlus}`,
        coordinates: [[450, 210], [650, 400], [450, 600], [260, 400]],
    },
    {
        method: `${theme.methodBrushSize}`,
        value: 150,
    },
    {
        method: `${theme.methodEraser}`,
        coordinates: [[500, 500]],
    },
    {
        method: `${theme.methodBrushSize}`,
        value: 10,
    },
    {
        method: `${theme.methodPolygonMinus}`,
        coordinates: [[450, 400], [600, 400], [450, 550], [310, 400]],
    },
];

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
    additionalAttrName: 'Attr 2',
    additionalValue: 'Attr value 2',
    typeAttribute: 'Text',
};

it('Prepare to testing', () => {
    cy.visit('/');
    cy.login();
    cy.get('.cvat-tasks-page').should('exist');
    const listItems = [];
    cy.document().then((doc) => {
        const collection = Array.from(doc.querySelectorAll('.cvat-item-task-name'));
        for (let i = 0; i < collection.length; i++) {
            listItems.push(collection[i].innerText);
        }
        if (listItems.indexOf(taskName) === -1) {
            cy.task('log', 'A task doesn\'t exist. Creating.');
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
