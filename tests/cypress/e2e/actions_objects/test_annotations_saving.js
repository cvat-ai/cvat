// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Test annotations saving works correctly', () => {
    const taskName = 'Test annotations saving works correctly';
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

    function useShortcut(clientID, shortcut) {
        cy.get('body').click();
        cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).trigger('mouseover');
        cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).should('have.class', 'cvat-objects-sidebar-state-active-item');
        cy.get('body').type(shortcut);
        cy.hideTooltips();
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin({ nextURL: '/tasks/create' });
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
        cy.wait('@getJobsRequest').then((interception) => {
            expect(interception.response.statusCode).to.equal(200);
            jobID = interception.response.body.results[0].id;

            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    describe('Check object saving works correctly', () => {
        it('Create different objects, save twice. Update, delete. Export hash works as expected', () => {
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

            for (const clientID of [1, 2, 3, 4, 5, 6, 7, 13]) {
                useShortcut(clientID, 'q');
            }

            cy.saveJob();
            cy.wait('@updateJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(4);
                expect(shapes.length).to.be.equal(4);
                expect(tags.length).to.be.equal(0);
            });
            cy.saveJob();

            for (const clientID of [1, 2, 3, 4, 5, 6, 7, 13, 19]) {
                useShortcut(clientID, '{shift}{del}');
                cy.get(`#cvat-objects-sidebar-state-item-${clientID}`).should('not.exist');
            }

            cy.saveJob();
            cy.wait('@deleteJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(4);
                expect(shapes.length).to.be.equal(4);
                expect(tags.length).to.be.equal(1);
            });
            cy.saveJob().then(() => {
                expect(createCounter).to.be.equal(1);
                expect(deleteCounter).to.be.equal(1);
                expect(updateCounter).to.be.equal(1);
            });
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
