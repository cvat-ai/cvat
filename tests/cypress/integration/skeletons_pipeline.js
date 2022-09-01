// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Manipulations with skeletons', () => {
    const labelName = 'skeleton';
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
    let taskID = null;

    before(() => {
        cy.visit('auth/login');
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

    describe('Create a task with skeletons', () => {
        it('Create a simple task', () => {
            cy.visit('/tasks/create');
            cy.get('#name').type(taskName);
            cy.get('.cvat-constructor-viewer-new-skeleton-item').click();
            cy.get('.cvat-skeleton-configurator').should('exist').and('be.visible');

            cy.get('.cvat-label-constructor-creator').within(() => {
                cy.get('#name').type(labelName);
                cy.get('.ant-radio-button-checked').within(() => {
                    cy.get('.ant-radio-button-input').should('have.attr', 'value', 'point');
                });
            });

            const pointsOffset = [
                { x: 0.55, y: 0.15 },
                { x: 0.20, y: 0.35 },
                { x: 0.43, y: 0.55 },
                { x: 0.63, y: 0.38 },
                { x: 0.27, y: 0.15 },
            ];

            cy.get('.cvat-skeleton-configurator-svg').then(($canvas) => {
                const canvas = $canvas[0];

                canvas.scrollIntoView();
                const rect = canvas.getBoundingClientRect();
                const { width, height } = rect;
                pointsOffset.forEach(({ x: xOffset, y: yOffset }) => {
                    canvas.dispatchEvent(new MouseEvent('mousedown', {
                        clientX: rect.x + width * xOffset,
                        clientY: rect.y + height * yOffset,
                        button: 0,
                        bubbles: true,
                    }));
                });

                cy.get('.ant-radio-button-wrapper:nth-child(3)').click().within(() => {
                    cy.get('.ant-radio-button-input').should('have.attr', 'value', 'join');
                });

                cy.get('.cvat-skeleton-configurator-svg').within(() => {
                    cy.get('circle').then(($circles) => {
                        expect($circles.length).to.be.equal(5);
                        $circles.each(function (i) {
                            const circle1 = this;
                            $circles.each(function (j) {
                                const circle2 = this;
                                if (i === j) return;
                                circle1.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                                circle1.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }));
                                circle1.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

                                circle2.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                                circle2.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }));
                                circle2.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
                            });
                        });
                    });
                });

                cy.contains('Continue').scrollIntoView().click();
                cy.contains('Continue').scrollIntoView().click();
                cy.get('input[type="file"]').attachFile(archiveName, { subjectType: 'drag-n-drop' });

                cy.intercept('/api/tasks?**').as('taskPost');
                cy.contains('Submit & Open').scrollIntoView().click();

                cy.wait('@taskPost').then((interception) => {
                    taskID = interception.response.body.id;
                    expect(interception.response.statusCode).to.be.equal(201);
                    cy.intercept(`/api/tasks/${taskID}?**`).as('getTask');
                    cy.wait('@getTask', { timeout: 10000 });
                    cy.get('.cvat-task-jobs-table-row').should('exist').and('be.visible');
                    cy.openJob();
                });
            });
        });
    });

    describe('Working with objects', () => {
        it('Creating and removing a skeleton shape', () => {

        });

        it('Creating and removing a skeleton track', () => {

        });

        it('Merging two skeletons', () => {

        });

        it('Splitting two skeletons', () => {

        });

        it('Resizing and dragging a skeleton', () => {

        });

        it('Lock, outside, hidden, occluded', () => {

        });
    });
});
