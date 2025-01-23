// Copyright (C) 2025 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// import { inspect } from 'util';
// import { taskName, labelName } from '../../support/const';

const taskName = '5frames';
const labelName = 'label';
// const attrName = 'attr';
const issueId = 'xxxx';
const imagesCount = 5;
const width = 400;
const height = 400;
const posX = 50;
const posY = 50;
const color = 'white';
const imageFileName = `image_${issueId}`;
const archiveName = `${imageFileName}.zip`;
const archivePath = `cypress/fixtures/${archiveName}`;
const imagesFolder = `cypress/fixtures/${imageFileName}`;
const dirToArchive = imagesFolder;

const createRectangleShape2Points = {
    points: 'By 2 Points',
    type: 'Shape',
    labelName,
    firstX: 250,
    firstY: 350,
    secondX: 350,
    secondY: 450,
};

describe('Description: user error, Could not receive frame 43 No one left position or right position was found. Interpolation impossible', () => {
    context('Create any track, check if track works correctly after deleting some frames', () => {
        before(() => {
            cy.visit('/auth/login');
            cy.login();
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(dirToArchive, archivePath);
            cy.createTaskFromArchive(taskName, labelName, archiveName);
            cy.goToTaskList();
            cy.openTaskJob(taskName);
            // TODO: compare runtimes of cy.createTaskFromArchive vs cy.headlessCreateTask
        });
        it('Create track and change its positions on frames 2 and 4', () => {
            /*
                - draw rectangle
                - learn to drag rectangle to any position
                - learn to drag rectangle to positions relative to the cvat_canvas_background (corners, sides, middle)
                -
            */
            cy.createRectangle(createRectangleShape2Points);
            cy.get('#cvat_canvas_background').then(([$cback]) => {
                const {
                    x: xb, y: yb, width: wb, height: hb,
                } = $cback.getBoundingClientRect();
                const cmiddle = {
                    x: (xb + wb) / 2,
                    y: (yb + hb) / 2,
                };
                const shape = {};
                cy.get('#cvat_canvas_shape_1').then(([$el]) => {
                    const {
                        x, y, w, h,
                    } = $el.getBoundingClientRect();
                    shape.x = x + cmiddle.x;
                    shape.y = y;
                    shape.width = w;
                    shape.height = h;
                });
                for (let i = 0; i < 1; i++) {
                    // cy.get('#cvat_canvas_shape_1').trigger('dragstart', 'center');
                    // cy.get('#cvat_canvas_shape_1').trigger('dragend');
                    // cy.get('#cvat_canvas_shape_1').trigger('mousemove',
                    // cy.get('#cvat_canvas_shape_1').trigger('dragend', { force: true });
                    const startX = shape.x + shape.width / 2;
                    const startY = shape.y + shape.height / 2;

                    // eslint-disable-next-line cypress/unsafe-to-chain-command
                    cy.get('#cvat_canvas_shape_1')
                        .trigger('mousedown', {
                            button: 0, which: 1, clientX: startX, clientY: startY,
                        }) // Simulate mouse down at start
                        .trigger('mousemove', { clientX: cmiddle.x, clientY: cmiddle.y }) // Simulate drag to end position
                        .trigger('mouseup', { force: true }); // Simulate mouse release
                }
                cy.screenshot();
            });
        });
        after(() => {
            assert(0);
        });
    });
});
