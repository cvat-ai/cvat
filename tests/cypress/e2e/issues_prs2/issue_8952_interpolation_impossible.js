// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const taskName = '5frames';
const labelName = 'label';
const attrName = 'attr1';
const textDefaultValue = 'Some text';
const issueId = '8952';
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

const [xtl, ytl, xbr, ybr] = [
    30, 30,
    30 + 34, 30 + 23,
];
const rect = {
    xtl, ytl, xbr, ybr,
};

function translateShape(shape, delta, axis) {
    if (axis === 'x') {
        return {
            ...shape,
            xtl: xtl + delta,
            xbr: xbr + delta,
        };
    }
    if (axis === 'y') {
        return {
            ...shape,
            ytl: ytl + delta,
            ybr: ybr + delta,
        };
    }
    return null;
}

context('Create any track, check if track works correctly after deleting some frames', () => {
    const precision = 0.01; // db server precision is 2 digits
    function readShapeCoords() {
        return cy.get('.cvat_canvas_shape').invoke('attr', 'x')
            .then((x) => cy.get('.cvat_canvas_shape').invoke('attr', 'y')
                .then((y) => ({ x: parseFloat(x), y: parseFloat(y) }),
                ),
            );
    }
    function validateShapeCoords({ x, y }) {
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
            cy.createZipArchive(imagesFolder, archivePath);
            cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);

            cy.goToTaskList();
            cy.openTaskJob(taskName);
            cy.url().should('contain', 'jobs').then((url) => {
                const last = url.lastIndexOf('/');
                jobID = parseInt(url.slice(last + 1), 10);
            }).then(() => {
                // Remove all annotations and draw a track rect
                const shape0 = rect;
                const shape1 = translateShape(shape0, delta, 'x');
                const shape2 = translateShape(shape1, delta, 'y');
                const track = {
                    shapes: [
                        {
                            frame: 0,
                            type: 'rectangle',
                            points: Object.values(shape0),
                            // ECMAScript guarantees chronological order of keys
                        },
                        {
                            frame: 2,
                            type: 'rectangle',
                            points: Object.values(shape1),
                        },
                        {
                            frame: 4,
                            type: 'rectangle',
                            points: Object.values(shape2),
                        },
                    ],
                    frame: 0,
                    labelName,
                    objectType: 'track',
                };
                cy.headlessCreateObjects([track], jobID);
            });
        });

        beforeEach(() => {
            cy.headlessRestoreAllFrames(jobID);

            // Get job meta updates from the server and reload page to bring changes to UI
            cy.reload();

            cy.saveJob();
            cy.get('.cvat-player-first-button').click();
        });
        it('Delete interpolated frames 0, 2, 4. Error should not appear', () => {
            // Delete frames 0, 2, 4. Watch out for errors
            cy.get('.cvat-player-first-button').click();
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

            // Reopening a task with bad metadata might throw an exception that we can catch
            cy.goToTaskList();
            cy.openTaskJob(taskName);
        });
        it('Change track positions on frames 2 and 4. Delete frame. Confirm same shape positions', () => {
            cy.goCheckFrameNumber(2);
            cy.clickDeleteFrameAnnotationView();
            cy.checkFrameNum(3);
            cy.clickSaveAnnotationView();

            let pos3 = null;
            readShapeCoords().then((posOnFrame3) => {
                pos3 = posOnFrame3;
                cy.goToPreviousFrame(1);
            });
            let pos1 = null;
            readShapeCoords().then((posOnFrame1) => {
                pos1 = posOnFrame1;
            });
            cy.reload().then(() => {
                cy.goToNextFrame(1).then(() => validateShapeCoords(pos1));
                cy.goToNextFrame(3).then(() => validateShapeCoords(pos3));
            });
        });
    });
});
