// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('RGB Color Control', () => {
    const caseId = '118';
    const labelName = `Case ${caseId}`;

    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'Some default value for type Text';
    const imagesCount = 3;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 400;
    const height = 400;
    const posX = 10;
    const posY = 10;
    const colors = ['red', 'blue', 'green'];
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const extension = 'jpg';

    before(() => {
        cy.visit('auth/login');
        cy.login();
        for (let i = 0; i < imagesCount; i++) {
            cy.imageGenerator(imagesFolder, imageFileName + i, width, height, colors[i], posX,
                posY, '', 1, extension);
        }
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTaskJob(taskName);
    });

    function checkColorValuesInBackground(color, clicks, comparison) {
        cy.get('#cvat_canvas_background')
            .then(($canvas) => {
                const maxDiff = 5000;
                const margin = 10;
                const ctx = $canvas[0].getContext('2d');
                const firstData = ctx.getImageData(0, 0, $canvas[0].width, $canvas[0].height);
                for (let c = 0; c < clicks; c++) {
                    cy.interactControlButton('rgb-color');
                    cy.get('.cvat-rgb-color-popover').contains(color).click();
                }
                cy.get('#cvat_canvas_background')
                    .then(($canvas1) => {
                        const ctx1 = $canvas1[0].getContext('2d');
                        const secondData = ctx1.getImageData(0, 0, $canvas1[0].width, $canvas1[0].height);
                        let pixelDiff = 0;
                        for (let p = 0; p < firstData.data.length; p++) {
                            if (Math.abs(firstData.data[p] - secondData.data[p]) > margin) {
                                pixelDiff += 1;
                            }
                        }
                        if (comparison === 'gt') {
                            expect(pixelDiff).to.gt(maxDiff);
                        } else {
                            expect(pixelDiff).to.lt(maxDiff);
                        }
                    });
            });
    }

    describe(`Testing case "${caseId}"`, () => {
        it('Load Color Channel.', () => {
            cy.interactControlButton('rgb-color');
        });
        it('Convert Red Test to Grey and Back', () => {
            checkColorValuesInBackground('Red', 1, 'gt');
            cy.interactControlButton('rgb-color');
            cy.get('.cvat-rgb-color-popover').contains('Red').click();
            checkColorValuesInBackground('Red', 2, 'lt');
        });
        it('Check that Blue Converts to Black and Green is the Same', () => {
            checkColorValuesInBackground('Red', 1, 'gt');
            checkColorValuesInBackground('Blue', 1, 'gt');
            checkColorValuesInBackground('Green', 1, 'lt');
        });
        it('Convert Blue Test to Grey and Back', () => {
            cy.goCheckFrameNumber(1);
            checkColorValuesInBackground('Blue', 1, 'gt');
            cy.interactControlButton('rgb-color');
            cy.get('.cvat-rgb-color-popover').contains('Blue').click();
            checkColorValuesInBackground('Blue', 2, 'lt');
        });
        it('Check that Red Converts to Black and Green is the Same', () => {
            checkColorValuesInBackground('Blue', 1, 'gt');
            checkColorValuesInBackground('Red', 1, 'gt');
            checkColorValuesInBackground('Green', 1, 'lt');
        });
        it('Convert Green Test to Grey and Back', () => {
            cy.goCheckFrameNumber(2);
            checkColorValuesInBackground('Green', 1, 'gt');
            cy.interactControlButton('rgb-color');
            cy.get('.cvat-rgb-color-popover').contains('Green').click();
            checkColorValuesInBackground('Blue', 2, 'lt');
        });
        it('Check that Red Converts to Black and Blue is the Same', () => {
            checkColorValuesInBackground('Green', 1, 'gt');
            checkColorValuesInBackground('Red', 1, 'gt');
            checkColorValuesInBackground('Blue', 1, 'lt');
        });
    });
});
