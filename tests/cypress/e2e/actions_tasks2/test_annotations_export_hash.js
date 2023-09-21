// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Test export hash when saving annotations', () => {
    const taskName = 'Test export hash when saving annotations';
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

    describe('Check saving twice', () => {
        it('Saving twice different shapes', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');

            cy.createRectangle({
                points: 'By 2 Points',
                type: 'Shape',
                labelName: generalLabel.name,
                firstX: 150,
                firstY: 350,
                secondX: 200,
                secondY: 400,
            });

            cy.createRectangle({
                points: 'By 2 Points',
                type: 'Track',
                labelName: generalLabel.name,
                firstX: 200,
                firstY: 400,
                secondX: 250,
                secondY: 450,
            });

            cy.createEllipse({
                type: 'Shape',
                labelName: generalLabel.name,
                firstX: 150,
                firstY: 350,
                secondX: 200,
                secondY: 400,
            });

            cy.createEllipse({
                type: 'Track',
                labelName: generalLabel.name,
                firstX: 200,
                firstY: 400,
                secondX: 250,
                secondY: 450,
            });

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

            cy.createSkeleton({
                xtl: 150,
                ytl: 350,
                xbr: 200,
                ybr: 400,
                labelName: skeletonLabel.name,
                type: 'Shape',
            });

            cy.createSkeleton({
                xtl: 200,
                ytl: 400,
                xbr: 250,
                ybr: 450,
                labelName: skeletonLabel.name,
                type: 'Track',
            });

            cy.createTag(generalLabel.name);

            cy.intercept('PATCH', `/api/jobs/${jobID}/annotations**action=create**`).as('createJobAnnotations');
            cy.intercept('PATCH', `/api/jobs/${jobID}/annotations**action=update`).as('updateJobAnnotations');
            cy.intercept('PATCH', `/api/jobs/${jobID}/annotations**action=delete`).as('deleteJobAnnotations');

            cy.saveJob();
            cy.wait('@createJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(4);
                expect(shapes.length).to.be.equal(4);
                expect(tags.length).to.be.equal(1);
            });

            cy.wait('@updateJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(0);
                expect(shapes.length).to.be.equal(0);
                expect(tags.length).to.be.equal(0);
            });

            cy.wait('@deleteJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(0);
                expect(shapes.length).to.be.equal(0);
                expect(tags.length).to.be.equal(0);
            });

            cy.saveJob();
            cy.wait('@createJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(0);
                expect(shapes.length).to.be.equal(0);
                expect(tags.length).to.be.equal(0);
            });

            cy.wait('@updateJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(0);
                expect(shapes.length).to.be.equal(0);
                expect(tags.length).to.be.equal(0);
            });

            cy.wait('@deleteJobAnnotations').then((interception) => {
                const { shapes, tags, tracks } = interception.response.body;
                expect(tracks.length).to.be.equal(0);
                expect(shapes.length).to.be.equal(0);
                expect(tags.length).to.be.equal(0);
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
