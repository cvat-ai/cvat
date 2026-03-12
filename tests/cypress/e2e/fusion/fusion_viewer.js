// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { projectName } from '../../support/const_fusion';

describe('Fusion Viewer plugin', () => {
    let projectID;

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();
        cy.readFile('cypress/fixtures/fusion_project.json').then((data) => {
            projectID = data.projectID;
            expect(projectID).to.be.a('number');
        });
    });

    describe('Project action menu', () => {
        it('Shows "Open Fusion Viewer" in project actions dropdown', () => {
            cy.visit('/projects');
            cy.get('.cvat-spinner').should('not.exist');

            // Find the project card and open the actions dropdown
            cy.openProjectActions(projectName);

            // Verify the fusion viewer menu item exists
            cy.get('.cvat-project-actions-menu')
                .should('exist')
                .and('be.visible')
                .within(() => {
                    cy.contains('Open Fusion Viewer').should('exist').and('be.visible');
                });

            // Dismiss the menu by pressing Escape
            cy.get('body').type('{esc}');
        });
    });

    describe('Fusion page navigation and layout', () => {
        it('Loads the fusion page at correct URL', () => {
            cy.visit(`/fusion/${projectID}`);
            cy.url().should('include', `/fusion/${projectID}`);

            // Should not show a 404 page
            cy.get('body').should('not.contain.text', '404');
            cy.get('body').should('not.contain.text', 'Not Found');
        });

        it('Renders the project title header', () => {
            cy.visit(`/fusion/${projectID}`);
            cy.contains(projectName, { timeout: 30000 }).should('exist').and('be.visible');
        });

        it('Renders the 2D panel with image and canvas elements', () => {
            cy.visit(`/fusion/${projectID}`);

            // The 2D panel should contain an img element and a canvas overlay
            cy.get('img', { timeout: 30000 }).should('exist');
            cy.get('canvas').should('exist');
        });

        it('Renders the 3D panel with a THREE.js canvas', () => {
            cy.visit(`/fusion/${projectID}`);

            // THREE.js renders into a canvas element; there should be at least two canvases
            // (one for 2D overlay and one or more for 3D)
            cy.get('canvas', { timeout: 30000 }).should('have.length.gte', 2);
        });

        it('Renders Link, Unlink, and Save buttons', () => {
            cy.visit(`/fusion/${projectID}`);

            cy.contains('button', 'Link', { timeout: 30000 }).should('exist').and('be.visible');
            cy.contains('button', 'Unlink').should('exist').and('be.visible');
            cy.contains('button', 'Save').should('exist').and('be.visible');
        });

        it('Renders the annotation table', () => {
            cy.visit(`/fusion/${projectID}`);

            // Ant Design Table renders with class .ant-table
            cy.get('.ant-table', { timeout: 30000 }).should('exist');
        });

        it('Renders the frame slider', () => {
            cy.visit(`/fusion/${projectID}`);

            // Ant Design Slider renders with class .ant-slider
            cy.get('.ant-slider', { timeout: 30000 }).should('exist').and('be.visible');
        });
    });

    describe('Frame navigation', () => {
        it('Frame slider can be interacted with', () => {
            cy.visit(`/fusion/${projectID}`);
            cy.get('.ant-slider', { timeout: 30000 }).should('exist').and('be.visible');

            // Get the slider handle and verify it exists
            cy.get('.ant-slider-handle').should('exist').and('be.visible');

            // Click on the slider rail to navigate frames
            cy.get('.ant-slider').then(($slider) => {
                const sliderRect = $slider[0].getBoundingClientRect();
                const midX = sliderRect.left + sliderRect.width / 2;
                const midY = sliderRect.top + sliderRect.height / 2;

                cy.get('.ant-slider').click(
                    Math.round(sliderRect.width / 2),
                    Math.round(sliderRect.height / 2),
                );
            });

            // Verify the slider handle is still present after interaction
            cy.get('.ant-slider-handle').should('exist');
        });
    });
});
