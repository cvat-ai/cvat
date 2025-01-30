// Copyright (C) 2025 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

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
    let newShape = null;
    if (axis === 'x') {
        newShape = {
            ...shape,
            firstX: shape.firstX + delta,
        };
    }
    if (axis === 'y') {
        newShape = {
            ...shape,
            firstY: shape.firstY + delta,
        };
    }
    cy.get(selector).then(() => {
        assert(newShape !== null, 'Could not find axis');
        cy.get(selector).trigger('mousemove', { scrollBehavior: false });
        cy.get(selector).should('have.class', 'cvat_canvas_shape_activated');
        cy.get(selector).trigger('mousedown', {
            button: 0, which: 1, force: true, scrollBehavior: false,
        });
        cy.get('#cvat_canvas_background').trigger('mousemove', newShape.firstX, newShape.firstY, {
            which: 1, force: true, scrollBehavior: false,
        });
        /* cy.invoke uses https://api.jquery.com/category/manipulation/ */
        cy.get(selector).trigger('mouseup', { force: true, scrollBehavior: false });
    });
    return newShape;
}

function shapeToPayload(shape, frame, label, shapeType) {
    return {
        frame,
        shapeType,
        points: [shape.firstX, shape.firstY, shape.secondX, shape.secondY],
        labelName: label,
        objectType: shape.type.toLowerCase(),
        occluded: false,
    };
}

context('Create any track, check if track works correctly after deleting some frames', () => {
    const precision = 0.01; // db server precision is 2 digits
    const stash = {};
    function storeShape(num) {
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
    describe('Description: user error, Could not receive frame 43 No one left position or right position was found. Interpolation impossible', () => {
        let jobID = null;
        before(() => {
            cy.visit('/auth/login');
            cy.login();

            // Create assets for task using nodeJS
            cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
            cy.createZipArchive(dirToArchive, archivePath);
            cy.createTaskFromArchive(taskName, labelName, archiveName);

            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.url().should('contain', 'jobs').then((url) => {
                const last = url.lastIndexOf('/');
                jobID = parseInt(url.slice(last + 1), 10);
            }).then(() => {
                // Remove all annotations and draw a track rect
                cy.headlessCreateObjects([
                    shapeToPayload(createRectangleShape2Points, 0, labelName, 'rectangle'),
                ],
                jobID);
            });
        });

        beforeEach(() => {
            // Restore all frames by patching deleted_frames to []
            cy.intercept('PATCH', '/api/jobs/**/data/meta**').as('patchMeta');
            cy.headlessRestoreAllFrames(jobID);
            cy.wait('@patchMeta');

            const shape = createRectangleShape2Points;

            // Get job meta updates from the server and reload page to bring changes to UI
            cy.intercept('GET', '/api/jobs/**/data/meta**').as('getMeta');
            cy.reload();
            cy.wait('@getMeta');

            // Drag
            cy.goToNextFrame(1);
            cy.goToNextFrame(2);
            const shape2 = drag(shape, '.cvat_canvas_shape', 500, 'x');
            cy.goToNextFrame(3);
            cy.goToNextFrame(4);
            // eslint-disable-next-line no-unused-vars
            const shape3 = drag(shape2, '.cvat_canvas_shape', 500, 'y');
            cy.saveJob();
            cy.clickFirstFrame();
        });
        it('Delete interpolated frames 0, 2, 4. Error should not appear', () => {
            cy.on('uncaught:exception', (err) => {
                const expectedMsg = 'No one left position or right position was found. Interpolation impossible. Client ID:';
                expect(err.message).to.include(expectedMsg); // Exclude familiar error
                throw err;
            });

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

            // This might pop up after deleting or saving (on firefox e.g.)
            cy.get('.ant-notification-notice-error').should('not.exist');

            // Reopening a task with bad metadata might throw an exception that we can catch
            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.get('.ant-notification-notice-error').should('not.exist');
        });
        it('Change track positions on frames 2 and 4. Delete frame. Confirm same shape positions', () => {
            cy.goToNextFrame(1);
            cy.goToNextFrame(2);
            cy.clickDeleteFrameAnnotationView();
            cy.clickSaveAnnotationView();
            cy.checkFrameNum(3);
            storeShape(3);
            cy.goToPreviousFrame(1);
            storeShape(1);
            cy.reload({ forceReload: false }).then(() => {
                cy.goToNextFrame(1).then(() => compareShape(1));
                cy.goToNextFrame(3).then(() => compareShape(3));
            });
        });
    });
});
