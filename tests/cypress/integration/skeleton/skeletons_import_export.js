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
        cy.visit('/tasks/create');
    });

    after(() => {
        cy.task('cleanFolder', downloadsFolder);
    });

    describe('Import and export svg skeleton file', () => {
        // TODO Move to common utils
        const getSvgAsXml = (filePath) => cy.readFile(filePath)
            .then((content) => {
                const contentWithRoot = `<root>${content}</root>`;
                const parser = new DOMParser();
                const xml = parser.parseFromString(contentWithRoot, 'image/svg+xml');
                return xml;
            });

        // TODO Move to common utils
        const compareCanvasWithSvg = (svgFilePath) => {
            getSvgAsXml(svgFilePath).then((xml) => {
                cy.get('.cvat-skeleton-configurator-svg').then((canvas) => {
                    const xmlNodes = xml.childNodes[0].childNodes;
                    const canvasNodes = canvas[0].childNodes;
                    xmlNodes.forEach((xmlNode, i) => {
                        if (xmlNode.nodeName === 'line' || xmlNode.nodeName === 'circle') {
                            const canvasNode = canvasNodes[i];
                            expect(xmlNode.attributes.length).to.be.eq(canvasNode.attributes.length);
                            for (const attr of xmlNode.attributes) {
                                expect(canvasNode.attributes[attr.name].value).to.be.eql(attr.value);
                            }
                        }
                    });
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
            cy.get('.cvat-constructor-viewer-new-skeleton-item').click();
            cy.get('.cvat-skeleton-configurator-svg-buttons > span').within(() => {
                cy.get('button').should('not.have.attr', 'disabled');
                cy.get('input').selectFile(fileToUpload, { force: true });
            });
            compareCanvasWithSvg(fileToUpload);
        });

        it('Download svg file', () => {
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
                    compareCanvasWithSvg(`${downloadsFolder}/${fileName}`);
                });
            });
        });
    });
});
