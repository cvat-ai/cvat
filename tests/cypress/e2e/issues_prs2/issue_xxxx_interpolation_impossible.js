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

function clickSave() {
    cy.get('button').contains('Save').click();
    cy.get('button').contains('Save').trigger('mouseout');
}
function clickDeleteFrame() {
    cy.get('.cvat-player-delete-frame').click();
    cy.get('.cvat-modal-delete-frame').within(() => {
        cy.contains('button', 'Delete').click();
    });
}

function drag(shape, selector, delta, axis) {
    // let x0; let y0;
    // let x1; let y1;
    cy.get(selector).then(() => {
        // ({ x: x0, y: y0 } = $el.getBoundingClientRect());
        // [x1, y1] = [x0, y0];
        if (axis === 'x') {
            // x1 += delta;
            shape.firstX += (delta);
        } else if (axis === 'y') {
            // y1 += delta;
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
                expect(parseFloat(xVal)).to.be.closeTo(x, 3.0);
                // cy.task('log', `compare: ${x} - ${xVal}`);
            });
            cy.get('.cvat_canvas_shape').invoke('attr', 'y').then((yVal) => {
                expect(parseFloat(yVal)).to.be.closeTo(y, 3.0);
                // cy.task('log', `compare: ${y} - ${yVal}`);
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
                cy.goToPreviousFrame(3).then(() => saveShape(3));
                cy.goToPreviousFrame(2);
                cy.goToPreviousFrame(1).then(() => saveShape(1));

                cy.saveJob();
            });
        });
        it('Change track positions on frames 2 and 4. Delete frame. Confirm same shape positions', () => {
            cy.goToNextFrame(2);
            cy.clickDeleteFrameAnnotationView();
            cy.clickSaveAnnotationView();
            cy.checkFrameNum(3);
            compareShape(3);
            cy.goToPreviousFrame(1);
            compareShape(1);
        });
        it('Delete interpolated frames 0, 2, 4. Error should not appear', () => {
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
            clickDeleteFrame();
            cy.checkFrameNum(1);
            cy.goToNextFrame(2);
            clickDeleteFrame();
            cy.checkFrameNum(3);
            cy.goToNextFrame(4);
            clickDeleteFrame();
            clickSave();
            // TODO: object should not be visible
            cy.get('.cvat_canvas_shape').should('not.be.visiable');

            // This might pop up after deleting or saving
            cy.get('.ant-notification-notice-error').should('not.exist');

            // Reopening a task with bad metadata might throw an exception that we can catch
            cy.goToTaskList();
            cy.openTaskJob(taskName);
        });
        after(() => {
            assert(0, 'let\'s watch a movie');
        });
    });
});
