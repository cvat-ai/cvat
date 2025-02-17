// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Slice and join tools', { scrollBehavior: false }, () => {
    const taskName = 'Slice and join actions';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];

    const basicMask = [{
        method: 'brush',
        coordinates: [[300, 300], [700, 300], [700, 700], [300, 700]],
    }];
    const doubleMask = [{
        method: 'brush',
        coordinates: [[200, 200], [300, 200], [300, 300], [200, 300]],
    },
    {
        method: 'brush',
        coordinates: [[200, 350], [300, 350], [300, 450], [200, 450]],
    },
    ];
    const filledMask = [{
        method: 'brush-size',
        value: 150,
    }, {
        method: 'brush',
        coordinates: [[300, 300], [400, 300], [400, 400], [300, 400]],
    }];

    const polygon = {
        reDraw: false,
        type: 'Shape',
        labelName: 'polygon label',
        pointsMap: [
            { x: 100, y: 100 },
            { x: 300, y: 140 },
            { x: 200, y: 440 },
            { x: 130, y: 300 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    let taskID = null;
    let jobID = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [
                { name: 'mask label', attributes: [], type: 'mask' },
                { name: 'polygon label', attributes: [], type: 'polygon' },
            ],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;
        }).then(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskID}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
    });

    beforeEach(() => {
        cy.removeAnnotations();
        cy.goCheckFrameNumber(0);
    });

    function checkSliceSuccess() {
        cy.get('#cvat_canvas_shape_1').should('not.exist');
        cy.get('#cvat_canvas_shape_2').should('exist').and('be.visible');
        cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
    }

    function checkJoinSuccess() {
        cy.get('#cvat_canvas_shape_2').should('not.exist');
        cy.get('#cvat_canvas_shape_3').should('not.exist');
        cy.get('#cvat_canvas_shape_4').should('exist').and('be.visible');
    }

    describe('Testing slice/join tools', () => {
        it('Draw basic mask. Slice into two shapes. Join back.', () => {
            cy.startMaskDrawing();
            cy.drawMask(basicMask);
            cy.finishMaskDrawing();

            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.sliceShape('#cvat_canvas_shape_1', [[1, 1], [250, 500], [720, 500]]);
            checkSliceSuccess();

            cy.joinShapes(['#cvat_canvas_shape_2', '#cvat_canvas_shape_3'], [[1, 1], [1, 1]]);
            checkJoinSuccess();
        });

        it('Draw one mask with two shapes. Slice into two shapes. Join back.', () => {
            cy.startMaskDrawing();
            cy.drawMask(doubleMask);
            cy.finishMaskDrawing();

            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.sliceShape('#cvat_canvas_shape_1', [[1, 1], [150, 230], [300, 230]]);
            checkSliceSuccess();

            cy.joinShapes(['#cvat_canvas_shape_2', '#cvat_canvas_shape_3'], [[1, 1], [1, 1]]);
            checkJoinSuccess();
        });

        it('Draw filled mask. Slice with polyline. Join back.', () => {
            cy.startMaskDrawing();
            cy.drawMask(filledMask);
            cy.finishMaskDrawing();

            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.sliceShape(
                '#cvat_canvas_shape_1',
                [
                    [50, 55], [180, 230], [210, 260],
                    [240, 200], [270, 230], [300, 230],
                    [330, 260], [360, 200], [390, 230],
                    [500, 230],
                ],
                { shortcut: '{alt}j' },
            );
            checkSliceSuccess();

            cy.joinShapes(
                ['#cvat_canvas_shape_2', '#cvat_canvas_shape_3'],
                [[50, 5], [70, 70]],
                { shortcut: 'j' },
            );
            checkJoinSuccess();
        });

        it('Draw polygon. Slice into two shapes.', () => {
            cy.createPolygon(polygon);
            cy.sliceShape(
                '#cvat_canvas_shape_1',
                [
                    [1, 1], [110, 160], [270, 240],
                ],
            );
            checkSliceSuccess();
        });

        it('Draw polygon. Slice with polyline.', () => {
            cy.createPolygon(polygon);
            cy.sliceShape(
                '#cvat_canvas_shape_1',
                [
                    [1, 1], [110, 160], [140, 150],
                    [170, 130], [190, 190], [230, 250],
                    [400, 130],
                ],
            );
            checkSliceSuccess();
        });

        it('Draw polygon. Check removing of slicing polyline points.', () => {
            cy.createPolygon(polygon);
            cy.sliceShape(
                '#cvat_canvas_shape_1',
                [
                    [1, 1], [110, 160], [140, 150],
                    [170, 130], [190, 190], [230, 250],
                ],
            );
            for (let i = 0; i < 5; i++) {
                cy.get('body').rightclick();
            }

            cy.get('.cvat-canvas-hints-container').within(() => {
                cy.contains('Set initial point on the shape contour').should('exist');
            });
            cy.get('body').type('{alt}j');
        });

        it('Draw mask. Slice with slip mode.', () => {
            cy.startMaskDrawing();
            cy.drawMask(filledMask);
            cy.finishMaskDrawing();

            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.sliceShape(
                '#cvat_canvas_shape_1',
                [
                    [50, 55], [180, 230], [200, 240],
                    [210, 250], [220, 260], [230, 270],
                    [240, 280], [250, 290], [260, 300],
                    [500, 230],
                ],
                { slipMode: true },
            );
            checkSliceSuccess();
        });
    });
});
