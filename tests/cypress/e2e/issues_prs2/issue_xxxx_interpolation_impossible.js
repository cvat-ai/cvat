// Copyright (C) 2025 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

const taskName = '5frames';
const labelName = 'label';
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

const [fX, fY] = [30, 30];
const [w, h] = [34, 23];
const createRectangleShape2Points = {
    points: 'By 2 Points',
    type: 'Track',
    labelName,
    firstX: fX,
    firstY: fY,
    secondX: (fX + w),
    secondY: (fY + h),
};

function drag(shape, selector, delta, axis) {
    cy.get(selector).then(() => {
        if (axis === 'x') {
            shape.firstX += (delta);
        } else if (axis === 'y') {
            shape.firstY += (delta);
        }
    }).then(() => {
        cy.get(selector).trigger('mousemove', { scrollBehavior: false });
        cy.get(selector).should('have.class', 'cvat_canvas_shape_activated');
        cy.get(selector).trigger('mousedown', {
            button: 0, which: 1, force: true, scrollBehavior: false,
        });
        cy.get('#cvat_canvas_background').trigger('mousemove', shape.firstX, shape.firstY, {
            which: 1, force: true, scrollBehavior: false,
        });
        /* cy.invoke uses https://api.jquery.com/category/manipulation/ */
        cy.get(selector).trigger('mouseup', { force: true, scrollBehavior: false });
    });
    return shape;
}

function shapeToImage(shape, imgScale, imgLeft, imgTop) {
    const shapew = Math.abs(shape.secondX - shape.firstX);
    const shapeh = Math.abs(shape.secondY - shape.firstY);
    const firstX = shape.firstX + imgLeft / imgScale;
    const firstY = shape.firstY + imgTop / imgScale;
    const secondX = firstX + shapew * imgScale;
    const secondY = firstY + shapeh * imgScale;
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
        let left;
        let top;
        const stash = {};
        const precision = 0.01; // db server precision is 2 digits
        function saveShape(num) {
            cy.get('.cvat_canvas_shape').invoke('attr', 'x').then((x) => {
                cy.get('.cvat_canvas_shape').invoke('attr', 'y').then((y) => {
                    stash[num] = { x: parseFloat(x), y: parseFloat(y) };
                });
            });
        }
        function compareShape(num) {
            const { x, y } = stash[num];
            cy.get('.cvat_canvas_shape').invoke('attr', 'x').then((xVal) => {
                expect(parseFloat(xVal)).to.be.closeTo(x, precision);
            });
            cy.get('.cvat_canvas_shape').invoke('attr', 'y').then((yVal) => {
                expect(parseFloat(yVal)).to.be.closeTo(y, precision);
            });
        }
        before(() => {
            cy.visit('/auth/login');
            cy.login();
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(dirToArchive, archivePath);
            cy.createTaskFromArchive(taskName, labelName, archiveName);
            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.get('.cvat-canvas-container').then(([$el]) => {
                cy.wrap($el).find('#cvat_canvas_background')
                    .then(([$canvas]) => {
                        const rect = $canvas.getBoundingClientRect();
                        imgScale = rect.width / width;
                        left = Number($canvas.style.left.replace('px', ''));
                        top = Number($canvas.style.top.replace('px', ''));
                    });
            }).then(() => {
                // Draw shape relative to image
                let shape = shapeToImage(createRectangleShape2Points, imgScale, left, top);
                cy.createRectangle(shape);

                // Drag shape across frames to trigger interpolation
                cy.goToNextFrame(1);
                cy.goToNextFrame(2);
                shape = drag(shape, '.cvat_canvas_shape', 500, 'x');
                cy.goToNextFrame(3);
                cy.goToNextFrame(4);
                shape = drag(shape, '.cvat_canvas_shape', 500, 'y');
                cy.saveJob();

                // Save shapes on interpolated frames' shapes
                cy.goToPreviousFrame(3);
                cy.goToPreviousFrame(2);
                cy.goToPreviousFrame(1);

                cy.saveJob();
            });
        });
        it('Change track positions on frames 2 and 4. Delete frame. Confirm same shape positions', () => {
            cy.goToNextFrame(2);
            cy.clickDeleteFrameAnnotationView();
            cy.clickSaveAnnotationView();
            cy.checkFrameNum(3);
            saveShape(3);
            cy.goToPreviousFrame(1);
            saveShape(1);
            cy.reload({ forceReload: false }).then(() => {
                cy.goToNextFrame(1).then(() => compareShape(1));
                cy.goToNextFrame(3).then(() => compareShape(3));
            });
        });
        it.skip('Delete interpolated frames 0, 2, 4. Error should not appear', () => {
            cy.on('uncaught:exception', (err) => {
                const expectedMsg = 'No one left position or right position was found. Interpolation impossible. Client ID:';
                expect(err.message).to.include(expectedMsg); // Exclude familiar error
                throw err;
            });

            // Undo deleted frame
            cy.clickUndo();

            // Delete frames 0, 2, 4. Watch out for errors
            cy.clickFirstFrame();
            cy.checkFrameNum(0);
            cy.clickDeleteFrameAnnotationView();
            cy.checkFrameNum(1);
            cy.goToNextFrame(2);
            cy.clickDeleteFrameAnnotationView();
            cy.checkFrameNum(3);
            cy.goToNextFrame(4);
            cy.clickDeleteFrameAnnotationView();

            // There should be no objects on the deleted frame
            cy.get('.cvat_canvas_shape').should('not.exist');
            cy.clickSaveAnnotationView();

            // This might pop up after deleting or saving
            cy.get('.ant-notification-notice-error').should('not.exist');

            // Reopening a task with bad metadata might throw an exception that we can catch
            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.get('.ant-notification-notice-error').should('not.exist');
        });
        after(() => assert(0));
    });
});
