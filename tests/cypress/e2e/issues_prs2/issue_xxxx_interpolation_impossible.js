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

function translateShape(shape, delta, axis) {
    if (axis === 'x') {
        return {
            ...shape,
            firstX: shape.firstX + delta,
            secondX: shape.secondX + delta,
        };
    }
    if (axis === 'y') {
        return {
            ...shape,
            firstY: shape.firstY + delta,
            secondY: shape.secondY + delta,
        };
    }
    return null;
}

function shapeToPayload(shape, frame, shapeType) {
    return {
        frame,
        type: shapeType,
        points: [shape.firstX, shape.firstY, shape.secondX, shape.secondY],
    };
}

function makeTrack(shapePayloads, frame0, trackLabel) {
    return {
        shapes: shapePayloads,
        frame: frame0,
        labelName: trackLabel,
        objectType: 'track',
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
        const delta = 300;
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
                const wrap = (shape, frame) => shapeToPayload(shape, frame, 'rectangle');
                const shape0 = createRectangleShape2Points;
                const shape1 = translateShape(shape0, delta, 'x');
                const shape2 = translateShape(shape1, delta, 'y'); // TODO: fix coords, rect flies away
                const track = makeTrack([
                    wrap(shape0, 0),
                    wrap(shape1, 2),
                    wrap(shape2, 4),
                ], 0, labelName);
                cy.headlessCreateObjects([track], jobID);
            });
        });

        beforeEach(() => {
            // Restore all frames by patching deleted_frames to []
            cy.intercept('PATCH', '/api/jobs/**/data/meta**').as('patchMeta');
            cy.headlessRestoreAllFrames(jobID);
            cy.wait('@patchMeta');

            // Get job meta updates from the server and reload page to bring changes to UI
            cy.intercept('GET', '/api/jobs/**/data/meta**').as('getMeta');
            cy.reload();
            cy.wait('@getMeta');

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
