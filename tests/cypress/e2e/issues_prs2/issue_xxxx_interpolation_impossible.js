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

// const createRectangleShape2Points = {
//     points: 'By 2 Points',
//     type: 'Shape',
//     labelName,
//     firstX: 250,
//     firstY: 350,
//     secondX: 350,
//     secondY: 450,
// };

// firstX /= 2;
// firstY /= 2;
const [fX, fY] = [50, 50];
const [w, h] = [34, 23];
const createRectangleShape2Points = {
    points: 'By 2 Points',
    type: 'Shape',
    labelName,
    firstX: fX,
    firstY: fY,
    secondX: (fX + w),
    secondY: (fY + h),
};

class Shape {
    constructor(x, y, wi, he) {
        this.firstX = x; this.firstY = y;
        this.secondX = x + wi; this.secondY = y + he;
        this.type = 'Shape';
        this.labelName = labelName;
        this.points = 'By 2 Points';
    }
} // for testing

function shapeToImage(shape, imgScale, imgLeft, imgTop) {
    const shapew = Math.abs(shape.secondX - shape.firstX);
    const shapeh = Math.abs(shape.secondY - shape.firstY);
    const firstX = shape.firstX + imgLeft / imgScale;
    const firstY = shape.firstY + imgTop / imgScale;
    const secondX = firstX + shapew * imgScale;
    const secondY = firstY + shapeh * imgScale;
    // absolute distances inside pic are scaled
    // distances outside pic are scaled inversely
    // TODO: check edge cases
    // TODO: check other imgs with different aspect ratios
    // TODO: impl imageToShape(canvasShapeRect, imgScale, canvasContainerRect)
    /*
            - CTM transform to find original point on canvas container
            - call shapeToImage to get the original shape
         */

    return {
        ...shape,
        firstX,
        firstY,
        secondX,
        secondY,
    };
}

describe('Description: user error, Could not receive frame 43 No one left position or right position was found. Interpolation impossible', () => {
    context('Create any track, check if track works correctly after deleting some frames', () => {
        let imgScale;
        let offsetX;
        let offsetY;
        let left;
        let top;
        before(() => {
            cy.visit('/auth/login');
            cy.login();
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(dirToArchive, archivePath);
            cy.createTaskFromArchive(taskName, labelName, archiveName);
            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.get('.cvat-canvas-container').then(([$el]) => {
                ({ x: offsetX, y: offsetY } = $el.getBoundingClientRect());
                cy.wrap($el).find('#cvat_canvas_background')
                    .then(([$canvas]) => {
                        const rect = $canvas.getBoundingClientRect();
                        imgScale = rect.width / width;
                        left = Number($canvas.style.left.replace('px', ''));
                        top = Number($canvas.style.top.replace('px', ''));
                    });
            }).then(() => {
                const s = shapeToImage(createRectangleShape2Points, offsetX, offsetY, imgScale, left, top);
                cy.task('log', `scale: ${imgScale}, offsetX: ${offsetX}, offsetY: ${offsetY}, left:${left}, top:${top}`);
                // cy.task('log', JSON.stringify(s));
                // cy.createRectangle(new Shape(10, 10, 40, 40));
                // cy.createRectangle(new Shape(20, 20, 40, 40));
                // cy.createRectangle(new Shape(40, 40, 40, 40));
                // cy.createRectangle(new Shape(60, 60, 40, 40));
                // cy.createRectangle(new Shape(70, 70, 40, 40));
                const fwd = (shape) => {
                    const t = shapeToImage(shape, offsetX, offsetY, imgScale, left, top);
                    cy.task('log', JSON.stringify(t, null, 2));
                    return t;
                };
                cy.createRectangle(s);
                cy.createRectangle(fwd(new Shape(100, 100, w, h)));
                cy.createRectangle(fwd(new Shape(150, 150, w, h)));
                cy.createRectangle(fwd(new Shape(350, 350, w, h)));
                cy.createRectangle(fwd(new Shape(300, 300, w, h)));
                // these should form a diagonal on the image
            });
            // TODO: compare runtimes of cy.createTaskFromArchive vs cy.headlessCreateTask
            cy.saveJob();
        });
        it.skip('Create track and change its positions on frames 2 and 4', () => {
            // es-lint disable-next-block
            /*
            - draw rectangle
            - learn to drag rectangle to any position
            - learn to drag rectangle to positions relative to the cvat_canvas_background (corners, sides, middle)
            -
            */
            cy.createRectangle(createRectangleShape2Points);
            cy.saveJob();
            cy.get('#cvat_canvas_background').then(([$cback]) => {
                const {
                    x: xb, y: yb, width: wb, height: hb,
                } = $cback.getBoundingClientRect();
                const cmiddle = {
                    x: (xb + wb) / 2,
                    y: (yb + hb) / 2,
                };
                /* eslint-disable */
                const c = {
                    xb, yb, wb, hb,
                };
                let shapeView = {};
                cy.get('#cvat_canvas_shape_1').then(([$el]) => {
                    const {
                        x, y, w, h,
                    } = $el.getBoundingClientRect();
                    shapeView = {
                        x, y, w, h,
                    };
                }).then(() => {
                    // Drag across frames
                    // TODO: drag functions
                    function dragRight(selector, delta) {
                        let rect;
                        cy.get(selector).invoke('getBoundingClientRect').then((r) => {
                            rect = r;
                        });
                        cy.get(selector).trigger('mousedown', {
                            button: 0, which: 1,
                        });
                        cy.get(selector).trigger('mousemove', { clientX: cmiddle.x, clientY: cmiddle.y }); // Simulate drag to end position
                        cy.get(selector).trigger('mouseup', { force: true }); // Simulate mouse release
                    }
                    cy.goToNextFrame(1);

                    for (let i = 0; i < 1; i++) {

                        // eslint-disable-next-line cypress/unsafe-to-chain-command
                    }
                });
                cy.screenshot();
            });
        });
        // after(() => {
        //     assert(0);
        // });
    });
});
