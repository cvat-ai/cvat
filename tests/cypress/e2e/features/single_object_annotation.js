// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Single object annotation mode', { scrollBehavior: false }, () => {
    const taskName = 'Single object annotation mode';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const frameCount = serverFiles.length;

    let taskID = null;
    let jobID = null;

    const rectangleShape = [
        { x: 300, y: 100 },
        { x: 400, y: 400 },
    ];
    const polygonShape = [
        { x: 300, y: 100 },
        { x: 400, y: 400 },
        { x: 400, y: 250 },
        { x: 450, y: 350 },
    ];
    const polylineShape = [
        { x: 300, y: 100 },
        { x: 400, y: 400 },
        { x: 400, y: 250 },
        { x: 450, y: 350 },
        { x: 500, y: 450 },
    ];
    const pointsShape = [
        { x: 300, y: 100 },
        { x: 400, y: 400 },
        { x: 400, y: 250 },
        { x: 450, y: 350 },
    ];
    const ellipseShape = [
        { x: 300, y: 100 },
        { x: 400, y: 400 },
    ];
    const cuboidShape = [
        { x: 300, y: 100 },
        { x: 400, y: 400 },
    ];
    const maskActions = [{
        method: 'brush',
        coordinates: [[300, 300], [700, 300], [700, 700], [300, 700]],
    }];

    function clickPoints(shape) {
        shape.forEach((element) => {
            cy.get('.cvat-canvas-container').click(element.x, element.y);
        });
    }

    function checkFrameNum(frameNum) {
        cy.get('.cvat-player-frame-selector').within(() => {
            cy.get('input[role="spinbutton"]').should('have.value', frameNum);
        });
    }

    function submitJob() {
        cy.get('.cvat-single-shape-annotation-submit-job-modal').should('exist');
        cy.get('.cvat-single-shape-annotation-submit-job-modal').within(() => { cy.contains('Submit').click(); });

        cy.intercept('PATCH', '/api/jobs/**').as('submitJob');
        cy.wait('@submitJob').its('response.statusCode').should('equal', 200);

        cy.get('.cvat-single-shape-annotation-submit-success-modal').should('exist');
        cy.get('.cvat-single-shape-annotation-submit-success-modal').within(() => { cy.contains('OK').click(); });
    }

    function checkSingleShapeModeOpened() {
        cy.get('.cvat-workspace-selector').should('have.text', 'Single shape');
        cy.get('.cvat-canvas-controls-sidebar').should('not.exist');
        cy.get('.cvat-player-frame-selector input').should('be.disabled');

        cy.get('.cvat-single-shape-annotation-sidebar-hint').should('exist');
        cy.get('.cvat-single-shape-annotation-sidebar-ux-hints').should('exist');
    }

    function openJob(params) {
        cy.visit(`/tasks/${taskID}/jobs/${jobID}`, {
            qs: {
                defaultWorkspace: 'single_shape',
                ...params,
            },
        });
        cy.get('.cvat-canvas-container').should('not.exist');
        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
    }

    function drawObject(creatorFunction) {
        checkSingleShapeModeOpened();

        for (let frame = 0; frame < frameCount; frame++) {
            checkFrameNum(frame);
            creatorFunction();
        }
        submitJob();
    }

    function changeLabel(labelName) {
        cy.get('.cvat-single-shape-annotation-sidebar-label-select').click();
        cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').within(() => {
            cy.get('.ant-select-item-option-content').contains(labelName).click();
        });
    }

    function resetAfterTestCase() {
        cy.removeAnnotations();
        cy.saveJob('PUT');
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [
                { name: 'rectangle_label', attributes: [], type: 'rectangle' },
                { name: 'polygon_label', attributes: [], type: 'polygon' },
                { name: 'polyline_label', attributes: [], type: 'polyline' },
                { name: 'points_label', attributes: [], type: 'points' },
                { name: 'ellipse_label', attributes: [], type: 'ellipse' },
                { name: 'cuboid_label', attributes: [], type: 'cuboid' },
                { name: 'mask_label', attributes: [], type: 'mask' },
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

    describe('Tests basic features of single shape annotation mode', () => {
        afterEach(resetAfterTestCase);

        it('Check basic single shape annotation pipeline for polygon', () => {
            openJob({ defaultLabel: 'polygon_label', defaultPointsCount: 4 });
            drawObject(() => clickPoints(polygonShape));
        });

        it('Check basic single shape annotation pipeline for rectangle', () => {
            openJob({ defaultLabel: 'rectangle_label' });
            drawObject(() => clickPoints(rectangleShape));
        });

        it('Check basic single shape annotation pipeline for polyline', () => {
            openJob({ defaultLabel: 'polyline_label', defaultPointsCount: 5 });
            drawObject(() => clickPoints(polylineShape));
        });

        it('Check basic single shape annotation pipeline for ellipse', () => {
            openJob({ defaultLabel: 'ellipse_label' });
            drawObject(() => clickPoints(ellipseShape));
        });

        it('Check basic single shape annotation pipeline for points', () => {
            openJob({ defaultLabel: 'points_label', defaultPointsCount: 4 });
            drawObject(() => clickPoints(pointsShape));
        });

        it('Check basic single shape annotation pipeline for cuboid', () => {
            openJob({ defaultLabel: 'cuboid_label' });
            drawObject(() => clickPoints(cuboidShape));
        });

        it('Check basic single shape annotation pipeline for mask', () => {
            openJob({ defaultLabel: 'mask_label' });
            cy.drawMask(maskActions);
            cy.finishMaskDrawing();
        });
    });

    describe('Tests advanced features of single shape annotation mode', () => {
        afterEach(resetAfterTestCase);

        it('Check single shape annotation mode controls', () => {
            openJob({ defaultLabel: 'polygon_label', defaultPointsCount: 4 });
            checkSingleShapeModeOpened();

            // Skip
            cy.get('.cvat-single-shape-annotation-sidebar-skip-wrapper').within(() => {
                cy.contains('Skip').click();
            });
            checkFrameNum(1);

            // Auto next frame - disabled
            cy.get('.cvat-single-shape-annotation-sidebar-auto-next-frame-checkbox').within(() => {
                cy.get('[type="checkbox"]').uncheck();
            });
            clickPoints(polygonShape);
            checkFrameNum(1);

            // Auto save when finish - disabled
            cy.get('.cvat-player-next-button-empty').click();
            cy.get('.cvat-single-shape-annotation-sidebar-auto-save-checkbox').within(() => {
                cy.get('[type="checkbox"]').uncheck();
            });
            clickPoints(polygonShape);
            cy.get('.cvat-single-shape-annotation-submit-job-modal').should('not.exist');

            // Navigate only on empty frames
            cy.get('.cvat-player-previous-button-empty').click();
            checkFrameNum(0);
            cy.get('.cvat-player-next-button-empty').click();
            checkFrameNum(0);
            cy.get('.cvat-single-shape-annotation-sidebar-navigate-empty-checkbox').within(() => {
                cy.get('[type="checkbox"]').uncheck();
            });
            cy.get('.cvat-player-next-button').click();
            checkFrameNum(1);
            cy.get('.cvat-player-next-button').click();
            checkFrameNum(2);

            cy.saveJob();
        });
    });

    describe('Regression tests', () => {
        afterEach(resetAfterTestCase);

        it('Changing labels in single shape annotation mode', () => {
            openJob({ defaultLabel: 'polygon_label', defaultPointsCount: 4 });
            checkSingleShapeModeOpened();

            const anotherLabelName = 'points_label';
            changeLabel(anotherLabelName);
            clickPoints(pointsShape);

            cy.changeWorkspace('Standard');
            cy.goCheckFrameNumber(0);
            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('.cvat-objects-sidebar-state-item-label-selector').should('have.text', anotherLabelName);
            });

            cy.saveJob();
        });
    });
});
