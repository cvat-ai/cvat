// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Manipulations with skeletons', () => {
    const labelName = 'skeleton';
    const taskName = 'skeletons main pipeline';

    before(() => {
        cy.visit('auth/login');
        cy.login();
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

                cy.contains('Continue').click();
                cy.contains('Continue').click();
            });
        });
    });

    describe('Create a project with skeletons', () => {
        it(`Set filter label == “${labelName}”.`, () => {

        });
    });
});
