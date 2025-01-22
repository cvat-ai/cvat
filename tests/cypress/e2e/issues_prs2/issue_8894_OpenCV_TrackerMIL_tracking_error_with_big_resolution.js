// // Copyright (C) 2024 CVAT.ai Corporation
// //
// // SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

// const Jimp = require('jimp');

// const createRectangleTrack2Points = {
//     points: 'By 2 Points',
//     type: 'Track',
//     firstX: 430,
//     firstY: 40,
//     secondX: 640,
//     secondY: 145,
//     labelName: 'Case101',
// };

// const shape = createRectangleTrack2Points;
// const width = 5000;
// const height = 5000;
// const posX = 10;
// const posY = 10;
// const issueId = '8894';
// const labelName = `${issueId}`;
// const attrName = `Attr for ${labelName}`;
// const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
// const color = 'gray';
// const imagesFolder = `cypress/fixtures/${imageFileName}`;
// const archiveName = `${imageFileName}.zip`;
// const archivePath = `cypress/fixtures/${archiveName}`;
// const directoryToArchive = imagesFolder;
// const extension = 'jpg';
// const textDefaultValue = 'Some default value for type Text';

describe('Generate Image with OffscreenCanvas', () => {
    before(() => {
        cy.window().then(async (win) => {
            const canvas = new win.OffscreenCanvas(5000, 5000);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'blue';
            ctx.font = '30px Arial';
            ctx.fillText('Hello C!', 50, 50);

            const blb = await canvas.convertToBlob();
            cy.generateImageFromCanvas(blb);
        });
    });
    it('Should confirm image was created', () => {
        // cy.window().then((win) => {
        //     const offscreen = new win.OffscreenCanvas(200, 200); // 200x200 canvas
        //     const ctx = offscreen.getContext('2d');

        //     // Draw something on the OffscreenCanvas
        //     ctx.fillStyle = 'blue';
        //     ctx.fillRect(0, 0, 200, 200);

        //     ctx.fillStyle = 'red';
        //     ctx.font = '30px Arial';
        //     ctx.fillText('Hello!', 50, 100);

        //     cy.writeFile('Output.png', offscreen.convertToBlob());
        // });
        cy.openTaskJob(taskName);
    });
});
