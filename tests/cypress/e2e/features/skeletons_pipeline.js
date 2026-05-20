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
    const skeleton2Size = 3;
    const skeleton2 = {
        name: 'person',
        points: [
            { x: 0.40, y: 0.25 },
            { x: 0.30, y: 0.50 },
            { x: 0.50, y: 0.50 },
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
    const skeleton2Position = {
        xtl: 450,
        ytl: 150,
        xbr: 600,
        ybr: 350,
    };
    let taskId = null;

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
        if (taskId !== null) {
            cy.task('getAuthHeaders').then((authHeaders) => {
                cy.request({
                    method: 'DELETE',
                    url: `/api/tasks/${taskId}`,
                    headers: authHeaders,
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
            cy.addNewSkeletonLabel(skeleton2);
            expect(skeleton2Size).to.be.equal(skeleton2.points.length);
            cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });
            cy.intercept('/api/tasks?**').as('taskPost');
            cy.contains('Submit & Open').scrollIntoView();
            cy.contains('Submit & Open').click();
            cy.wait('@taskPost').then((interception) => {
                taskId = interception.response.body.id;
                expect(interception.response.statusCode).to.be.equal(201);
                cy.url().should('include', `/tasks/${taskId}`);
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

    describe('Filtering skeleton elements', () => {
        before(() => {
            cy.removeAnnotations();
            cy.goCheckFrameNumber(0);
        });

        it('Create multiple skeleton objects for filtering tests', () => {
            cy.createSkeleton({
                ...skeletonPosition,
                labelName: skeleton.name,
                type: 'Shape',
            });

            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');

            cy.createSkeleton({
                ...skeleton2Position,
                labelName: skeleton2.name,
                type: 'Track',
            });

            cy.get('.cvat_canvas_shape').should('have.length.at.least', 2);

            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('.cvat-objects-sidebar-state-item-elements-collapse').click();
            });
            cy.get('#cvat-objects-sidebar-state-item-element-2').within(() => {
                cy.get('.cvat-object-item-button-occluded').click();
            });
            cy.get('#cvat_canvas_shape_2').should('have.class', 'cvat_canvas_shape_occluded');
        });

        it('Filter by skeleton sublabel keypoint group', () => {
            const sublabelName = `${skeleton.name} / 1`;

            cy.addFiltersRule(0, 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: sublabelName,
                submit: true,
            });

            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('not.exist');
            cy.get('#cvat_canvas_shape_7').should('not.exist');

            cy.clearFilters();
        });

        it('Filter by multiple skeleton elements using OR condition', () => {
            const sublabel1 = `${skeleton.name} / 1`;
            const sublabel2 = `${skeleton2.name} / 2`;

            cy.addFiltersRule(0, 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: sublabel1,
            });
            cy.addFiltersRule(0, 'elements');
            cy.setGroupCondition(0, 'Or', 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 0,
                ruleIndex: 1,
                field: 'Label',
                operator: '==',
                value: sublabel2,
                submit: true,
            });

            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('not.exist');
            cy.get('#cvat_canvas_shape_7').should('exist');
            cy.get('#cvat_canvas_shape_8').should('not.exist');
            cy.get('#cvat_canvas_shape_9').should('exist');
            cy.get('#cvat_canvas_shape_10').should('not.exist');

            cy.clearFilters();
        });

        it('Filter skeleton elements by occluded property', () => {
            const sublabel1 = `${skeleton.name} / 1`;

            cy.addFiltersRule(0, 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: sublabel1,
            });
            cy.addFiltersRule(0, 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 0,
                ruleIndex: 1,
                field: 'Occluded',
                operator: '==',
                value: 'true',
                submit: true,
            });

            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('not.exist');
            cy.get('#cvat_canvas_shape_7').should('not.exist');

            cy.clearFilters();
        });

        it('Complex filter: ((label == "person / 1") || (label == "skeleton / 1")) && occluded == true', () => {
            const sublabel1 = `${skeleton2.name} / 2`;
            const sublabel2 = `${skeleton.name} / 1`;

            cy.addFiltersGroup(0, 'elements');
            cy.addFiltersGroup(0, 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 1,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: sublabel1,
            });
            cy.addFiltersRule(1, 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 1,
                ruleIndex: 1,
                field: 'Occluded',
                operator: '==',
                value: 'true',
            });

            cy.setGroupCondition(0, 'Or', 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 2,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: sublabel2,
            });
            cy.addFiltersRule(2, 'elements');
            cy.setFilter({
                target: 'elements',
                groupIndex: 2,
                ruleIndex: 1,
                field: 'Occluded',
                operator: '==',
                value: 'true',
                submit: true,
            });

            cy.get('#cvat_canvas_shape_1').should('exist');
            cy.get('#cvat_canvas_shape_2').should('exist');
            cy.get('#cvat_canvas_shape_3').should('not.exist');
            cy.get('#cvat_canvas_shape_7').should('not.exist');

            cy.clearFilters();
        });
    });
});
