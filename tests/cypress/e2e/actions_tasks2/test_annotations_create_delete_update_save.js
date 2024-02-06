// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Test basic actions with annotations', () => {
    const taskName = 'Test basic actions with annotations';
    const serverFiles = {
        images: ['image_1.jpg', 'image_2.jpg', 'image_3.jpg'],
    };

    const generalLabel = {
        name: 'test label',
    };

    const skeletonLabel = {
        name: 'skeleton',
        points: [
            { x: 0.55, y: 0.15 },
            { x: 0.20, y: 0.35 },
            { x: 0.43, y: 0.55 },
            { x: 0.63, y: 0.38 },
            { x: 0.27, y: 0.15 },
        ],
    };

    let taskID = null;
    let jobID = null;

    function lockObject(clientID) {
        cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).within(() => {
            cy.get('.cvat-object-item-button-lock').click();
        });
    }

    function deleteObjectViaShortcut(clientID, shortcut) {
        cy.get('body').click();
        cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).trigger('mouseover');
        cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).should('have.class', 'cvat-objects-sidebar-state-active-item');
        cy.get('body').type(shortcut);
    }

    function checkExistObject(clientID, state) {
        cy.get(`cvat_canvas_shape_${clientID}`).should(state);
        cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).should(state);
    }

    function checkFailDeleteLockObject(clientID, shortcut) {
        deleteObjectViaShortcut(clientID, shortcut);
        checkExistObject(clientID, 'exist');
        cy.get('.cvat-modal-confirm-remove-object').should('exist');
        cy.get('.cvat-modal-confirm-remove-object').within(() => {
            cy.contains('Cancel').click();
            cy.get('.cvat-modal-confirm-remove-object').should('not.exist');
        });
    }

    function clickRemoveOnDropdownMenu() {
        cy.get('.cvat-object-item-menu').contains(new RegExp('^Remove$', 'g')).click({ force: true });
    }

    function deleteObjectViaGUIFromSidebar(clientID) {
        cy.get('.cvat-objects-sidebar-states-list').within(() => {
            cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).within(() => {
                cy.get('span[aria-label="more"]').click();
            });
        });
        clickRemoveOnDropdownMenu();
    }

    function deleteObjectViaCanvasContextMenu(clientID) {
        cy.get('.cvat-canvas-container').within(() => {
            cy.get(`cvat_canvas_shape_${clientID}`).trigger('mousemove');
            cy.get(`cvat_canvas_shape_${clientID}`).rightclick();
        });
        cy.get('.cvat-canvas-context-menu').within(() => {
            cy.get('.cvat-objects-sidebar-state-item').within(() => {
                cy.get('span[aria-label="more"]').click();
            });
        });
        clickRemoveOnDropdownMenu();
    }

    function actionOnConfirmWindow(textBuntton) {
        cy.get('.cvat-modal-confirm-remove-object').within(() => {
            cy.contains(textBuntton, 'g').click();
        });
    }

    before(() => {
        cy.headlessLogin();
        cy.visit('/tasks/create');
        cy.get('#name').type(taskName);
        cy.addNewLabel({ name: generalLabel.name });
        cy.addNewSkeletonLabel(skeletonLabel);
        cy.selectFilesFromShare(serverFiles);
        cy.intercept('POST', '/api/tasks**').as('createTaskRequest');
        cy.intercept('GET', '/api/jobs**').as('getJobsRequest');
        cy.contains('button', 'Submit & Continue').click();
        cy.wait('@createTaskRequest').then((interception) => {
            expect(interception.response.statusCode).to.equal(201);
            taskID = interception.response.body.id;
        });
        cy.wait('@getJobsRequest', { requestTimeout: 10000 }).then((interception) => {
            expect(interception.response.statusCode).to.equal(200);
            jobID = interception.response.body.results[0].id;
        });
    });

    describe('Create, twice save, lock, delete objects', () => {
        it('Saving twice different shapes', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');

            // client id 1
            cy.createRectangle({
                points: 'By 2 Points',
                type: 'Shape',
                labelName: generalLabel.name,
                firstX: 150,
                firstY: 350,
                secondX: 200,
                secondY: 400,
            });

            // client id 2
            cy.createRectangle({
                points: 'By 2 Points',
                type: 'Track',
                labelName: generalLabel.name,
                firstX: 200,
                firstY: 400,
                secondX: 250,
                secondY: 450,
            });

            // client id 3
            cy.createEllipse({
                type: 'Shape',
                labelName: generalLabel.name,
                firstX: 150,
                firstY: 350,
                secondX: 200,
                secondY: 400,
            });

            // client id 4
            cy.createEllipse({
                type: 'Track',
                labelName: generalLabel.name,
                firstX: 200,
                firstY: 400,
                secondX: 250,
                secondY: 450,
            });

            // client id 5
            cy.createPolygon({
                reDraw: false,
                type: 'Shape',
                labelName: generalLabel.name,
                pointsMap: [
                    { x: 200, y: 350 },
                    { x: 250, y: 350 },
                    { x: 250, y: 400 },
                    { x: 200, y: 400 },
                ],
                complete: true,
                numberOfPoints: null,
            });

            // client id 6
            cy.createPolygon({
                reDraw: false,
                type: 'Track',
                labelName: generalLabel.name,
                pointsMap: [
                    { x: 150, y: 400 },
                    { x: 200, y: 400 },
                    { x: 200, y: 450 },
                    { x: 150, y: 450 },
                ],
                complete: true,
                numberOfPoints: null,
            });

            // client id 7
            cy.createSkeleton({
                xtl: 150,
                ytl: 350,
                xbr: 200,
                ybr: 400,
                labelName: skeletonLabel.name,
                type: 'Shape',
            });

            // client id 8
            cy.createSkeleton({
                xtl: 200,
                ytl: 400,
                xbr: 250,
                ybr: 450,
                labelName: skeletonLabel.name,
                type: 'Track',
            });

            // client id 9
            cy.createTag(generalLabel.name);

            let createCounter = 0;
            let deleteCounter = 0;
            let updateCounter = 0;

            cy.intercept('PATCH', `/api/jobs/${jobID}/annotations**action=create**`, () => createCounter++).as('createJobAnnotations');
            cy.intercept('PATCH', `/api/jobs/${jobID}/annotations**action=delete`, () => deleteCounter++).as('deleteJobAnnotations');
            cy.intercept('PATCH', `/api/jobs/${jobID}/annotations**action=update`, () => updateCounter++).as('updateJobAnnotations');

            cy.saveJob();
            cy.wait('@createJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(4);
                expect(shapes.length).to.be.equal(4);
                expect(tags.length).to.be.equal(1);
            });
            cy.saveJob();

            // delete object
            deleteObjectViaShortcut(1, '{del}');
            checkExistObject(1, 'not.exist');

            // locked object requires additional confirmation, but may be deleted with shift
            lockObject(2);
            checkFailDeleteLockObject(2, '{del}');
            deleteObjectViaShortcut(2, '{shift}{del}');
            checkExistObject(2, 'not.exist');

            // delete via sidebar
            deleteObjectViaGUIFromSidebar(3);
            checkExistObject(3, 'not.exist');

            // delete locked object via sidebar
            lockObject(4);
            deleteObjectViaGUIFromSidebar(4);
            actionOnConfirmWindow('Yes');
            checkExistObject(4, 'not.exist');

            // locked object can be deleted from canvas context menu
            lockObject(5);
            deleteObjectViaCanvasContextMenu(5);
            actionOnConfirmWindow('Yes');
            checkExistObject('not.exist');

            // tag can be deleted
            deleteObjectViaGUIFromSidebar(9);

            cy.saveJob();
            cy.wait('@deleteJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(2);
                expect(shapes.length).to.be.equal(3);
                expect(tags.length).to.be.equal(1);
            });
            cy.saveJob();

            // check updated objects on save
            cy.get('#cvat-objects-sidebar-state-item-7').within(() => {
                cy.get('.cvat-object-item-button-occluded').click();
            });
            cy.saveJob();
            cy.wait('@updateJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(0);
                expect(shapes.length).to.be.equal(7);
                expect(tags.length).to.be.equal(0);
            });
            cy.saveJob();

            // check extra requests were not made
            cy.expect(createCounter).to.be.equal(1);
            cy.expect(updateCounter).to.be.equal(1);
            cy.expect(deleteCounter).to.be.equal(1);
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
});
