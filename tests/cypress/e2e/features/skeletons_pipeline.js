// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Manipulations with skeletons', { scrollBehavior: false }, () => {
    const skeletonSize = 5;
    const skeleton = {
        name: 'skeleton',
        points: [
            { x: 0.55, y: 0.15 },
            { x: 0.20, y: 0.35 },
            { x: 0.43, y: 0.55 },
            { x: 0.63, y: 0.38 },
            { x: 0.27, y: 0.15 },
        ],
    };
    const taskName = 'skeletons main pipeline';
    const imagesFolder = `cypress/fixtures/${taskName}`;
    const archiveName = `${taskName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imageParams = {
        width: 800,
        height: 800,
        color: 'gray',
        textOffset: { x: 10, y: 10 },
        text: 'skeletons pipeline',
        count: 5,
    };
    const skeletonPosition = {
        xtl: 100,
        ytl: 100,
        xbr: 300,
        ybr: 300,
    };
    let taskID = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(
            imagesFolder,
            taskName,
            imageParams.width,
            imageParams.height,
            imageParams.color,
            imageParams.textOffset.x,
            imageParams.textOffset.y,
            imageParams.text,
            imageParams.count,
        );
        cy.createZipArchive(imagesFolder, archivePath);
    });

    after(() => {
        cy.headlessLogout();
        if (taskID !== null) {
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
        }
    });

    describe('Create a task with skeletons', () => {
        it('Create a simple task', () => {
            cy.visit('/tasks/create');
            cy.get('#name').type(taskName);
            cy.addNewSkeletonLabel(skeleton);
            expect(skeletonSize).to.be.equal(skeleton.points.length);
            cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });
            cy.intercept('/api/tasks?**').as('taskPost');
            cy.contains('Submit & Open').scrollIntoView();
            cy.contains('Submit & Open').click();
            cy.wait('@taskPost').then((interception) => {
                taskID = interception.response.body.id;
                expect(interception.response.statusCode).to.be.equal(201);
                cy.intercept(`/api/tasks/${taskID}`).as('getTask');
                cy.wait('@getTask');
                cy.get('.cvat-job-item').should('exist').and('be.visible');
                cy.openJob();
            });
        });
    });

    describe('Working with objects', () => {
        function createSkeletonObject(shapeType) {
            cy.createSkeleton({
                ...skeletonPosition,
                labelName: skeleton.name,
                type: `${shapeType[0].toUpperCase()}${shapeType.slice(1).toLowerCase()}`,
            });
            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-1').should('exist').and('be.visible')
                .within(() => {
                    cy.get('.cvat-objects-sidebar-state-item-object-type-text').should('have.text', `SKELETON ${shapeType}`.toUpperCase());
                    cy.get('.cvat-objects-sidebar-state-item-label-selector').within(() => {
                        cy.get('input').should('be.disabled');
                    });
                    cy.get('.cvat-objects-sidebar-state-item-elements-collapse').should('exist').and('be.visible').click();
                    cy.get('.cvat-objects-sidebar-state-item-elements').should('have.length', skeletonSize);
                });
        }

        function deleteSkeleton(selector, shapeType, force) {
            cy.get('body').type(force ? '{shift}{del}' : '{del}');
            if (shapeType.toLowerCase() === 'track' && !force) {
                cy.get('.cvat-remove-object-confirm-wrapper').should('exist').and('be.visible');
                cy.get('.ant-modal-content').within(() => {
                    cy.contains('Yes').click();
                });
            }
            cy.get(selector).should('not.exist');
        }

        it('Wrapping bounding box for a skeleton is visible only when skeleton is activated', () => {
            createSkeletonObject('shape');

            cy.get('body').click();
            cy.get('#cvat_canvas_shape_1').within(($el) => {
                cy.get('.cvat_canvas_skeleton_wrapping_rect').should('exist').and('not.be.visible');
                cy.wrap($el).trigger('mousemove');
                cy.wrap($el).should('have.class', 'cvat_canvas_shape_activated');
                cy.get('.cvat_canvas_skeleton_wrapping_rect').should('exist').and('be.visible');
            });

            cy.removeAnnotations();
        });

        it('Creating, checking occluded for a single point, and removing a skeleton shape', () => {
            createSkeletonObject('shape');

            cy.get('#cvat-objects-sidebar-state-item-element-2').within(() => {
                cy.get('span[aria-label="user"]').click();
            });
            cy.get('#cvat_canvas_shape_2').should('have.class', 'cvat_canvas_shape_occluded');

            deleteSkeleton('#cvat_canvas_shape_1', 'shape', false);
            cy.removeAnnotations();
        });

        it('Creating, re-drawing, and removing a skeleton track', () => {
            createSkeletonObject('track');

            // redraw a tracked shape on the latest frame
            const REDRAW_MARGIN = 400;
            let prevX = Number.MAX_SAFE_INTEGER;
            let prevY = Number.MAX_SAFE_INTEGER;
            cy.goCheckFrameNumber(imageParams.count - 1);
            cy.get('#cvat_canvas_shape_1').within(() => {
                cy.get('rect').then(($rect) => {
                    prevX = +$rect[0].getAttribute('x');
                    prevY = +$rect[0].getAttribute('y');
                });
            });
            cy.get('body').trigger('keydown', { keyCode: 78, code: 'KeyN', shiftKey: true });
            cy.get('.cvat-canvas-container')
                .click(skeletonPosition.xtl + REDRAW_MARGIN, skeletonPosition.ytl + REDRAW_MARGIN);
            cy.get('.cvat-canvas-container')
                .click(skeletonPosition.xbr + REDRAW_MARGIN, skeletonPosition.ybr + REDRAW_MARGIN);
            cy.get('.cvat-cursor-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('#cvat_canvas_shape_1').within(() => {
                cy.get('rect').then(($rect) => {
                    expect(+$rect[0].getAttribute('x')).to.be.gt(prevX);
                    expect(+$rect[0].getAttribute('y')).to.be.gt(prevY);
                });
            });
            // and, finally delete the skeleton
            deleteSkeleton('#cvat_canvas_shape_1', 'track', false);

            cy.removeAnnotations();
            cy.goCheckFrameNumber(0);
            createSkeletonObject('track');
            deleteSkeleton('#cvat_canvas_shape_1', 'track', true);
        });

        it('Splitting two skeletons and merge them back', () => {
            cy.removeAnnotations();
            createSkeletonObject('track');

            const splittingFrame = Math.trunc(imageParams.count / 2);
            cy.goCheckFrameNumber(splittingFrame);

            cy.get('.cvat-split-track-control').click();
            cy.get('#cvat_canvas_shape_1').click();
            cy.get('#cvat_canvas_shape_1').click();

            // check objects after splitting
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.get('#cvat_canvas_shape_12').should('exist').and('not.be.visible');
            cy.get('#cvat_canvas_shape_18').should('exist').and('be.visible');

            cy.goToNextFrame(splittingFrame + 1);

            cy.get('#cvat_canvas_shape_12').should('not.exist');
            cy.get('#cvat_canvas_shape_18').should('exist').and('be.visible');

            // now merge them back
            cy.get('.cvat-merge-control').click();
            cy.get('#cvat_canvas_shape_18').click();

            cy.goCheckFrameNumber(0);

            cy.get('#cvat_canvas_shape_12').click();
            cy.get('body').type('m');

            // and check objects after merge
            cy.get('#cvat_canvas_shape_12').should('not.exist');
            cy.get('#cvat_canvas_shape_18').should('not.exist');

            cy.get('#cvat_canvas_shape_24').should('exist').and('be.visible');
            cy.goCheckFrameNumber(splittingFrame + 1);
            cy.get('#cvat_canvas_shape_24').should('exist').and('be.visible');
            cy.goCheckFrameNumber(imageParams.count - 1);
            cy.get('#cvat_canvas_shape_24').should('exist').and('be.visible');

            cy.removeAnnotations();
        });

        it('Copy/paste a skeleton shape', () => {
            createSkeletonObject('shape');
            cy.get('#cvat_canvas_shape_2').click();
            cy.get('#cvat_canvas_shape_2').trigger('mouseover');
            cy.get('body').type('{ctrl}c');
            cy.get('body').type('{ctrl}v');
            cy.get('.cvat-canvas-container').click();

            cy.get('#cvat_canvas_shape_7').should('exist').and('be.visible');

            cy.removeAnnotations();
        });
    });
});
