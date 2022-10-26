// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Importing and exporting skeletons', () => {
    const fileToUpload = 'mounted_file_share/svg/upload.svg';
    const { downloadsFolder } = require('../../../cypress.json');

    before(() => {
        cy.task('createFolder', downloadsFolder);
    });

    beforeEach(() => {
        cy.loginHeadless();
    });

    after(() => {
        cy.task('cleanFolder', downloadsFolder);
    });

    describe('Import and export svg skeleton file', () => {
        // TODO Move to common utils
        const getSvgElementCount = (filePath) => cy.readFile(filePath)
            .then((content) => {
                const contentWithRoot = `<root>${content}</root>`;
                const parser = new DOMParser();
                const xml = parser.parseFromString(contentWithRoot, 'image/svg+xml');
                /* eslint-disable-next-line */
                expect(xml.querySelector('parsererror'), 'SVG parsing error').to.be.null;
                const circles = xml.getElementsByTagName('circle');
                const lines = xml.getElementsByTagName('line');
                console.log({
                    circle: circles.length,
                    line: lines.length,
                });
                return {
                    circle: circles.length,
                    line: lines.length,
                };
            });

        // TODO Move to common utils
        const compareCanvasWithSvg = (svgFilePath) => {
            getSvgElementCount(svgFilePath).then((svgElements) => {
                cy.get('.cvat-skeleton-configurator-svg').within(() => {
                    cy.get('circle').should('have.length', svgElements.circle);
                    if (svgElements.line) {
                        cy.get('line').should('have.length', svgElements.line);
                    } else {
                        cy.get('line').should('not.exist');
                    }
                });
            });
        };

        // TODO Move to Page Object Model
        const drawCanvasPoints = (pointsOffset) => {
            cy.get('.cvat-skeleton-configurator-svg').then(($canvas) => {
                const canvas = $canvas[0];
                canvas.scrollIntoView();
                const rect = canvas.getBoundingClientRect();
                const { width, height } = rect;
                pointsOffset.forEach(({ x: xOffset, y: yOffset }) => {
                    canvas.dispatchEvent(new MouseEvent('mousedown', {
                        clientX: rect.x + width * xOffset,
                        clientY: rect.y + height * yOffset,
                        button: 0,
                        bubbles: true,
                    }));
                });
            });
        };

        it('Upload svg file', () => {
            cy.visit('/tasks/create');
            cy.get('.cvat-constructor-viewer-new-skeleton-item').click();
            cy.get('.cvat-skeleton-configurator-svg-buttons > span').within(() => {
                cy.get('button').should('not.have.attr', 'disabled');
                cy.get('input').selectFile(fileToUpload, { force: true });
            });
            compareCanvasWithSvg(fileToUpload);
        });

        it('Download svg file', () => {
            cy.visit('/tasks/create');
            cy.get('.cvat-constructor-viewer-new-skeleton-item').click();

            const points = [
                { x: 0.55, y: 0.15 },
                { x: 0.20, y: 0.35 },
                { x: 0.43, y: 0.55 },
            ];
            drawCanvasPoints(points);

            cy.task('listFiles', downloadsFolder).then((before) => {
                cy.get('.cvat-skeleton-configurator-svg-buttons > button').click();
                cy.task('listFiles', downloadsFolder).then((after) => {
                    expect(after.length).to.be.eq(before.length + 1);
                    return (after.filter((f) => !before.includes(f)))[0];
                }).then((fileName) => {
                    cy.log(fileName);
                    compareCanvasWithSvg(`${downloadsFolder}/${fileName}`);
                });
            });
        });
    });
});
