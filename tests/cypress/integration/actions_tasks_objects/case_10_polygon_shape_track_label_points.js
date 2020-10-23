/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Actions on polygon', () => {
    const caseId = '10';
    const newLabelName = `New label for case ${caseId}`;
    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 250, y: 250 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolygonTrack = {
        reDraw: false,
        type: 'Track',
        switchLabel: false,
        pointsMap: [
            { x: 300, y: 200 },
            { x: 350, y: 200 },
            { x: 350, y: 350 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolygonShapePoints = {
        reDraw: false,
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            { x: 400, y: 200 },
            { x: 450, y: 200 },
            { x: 450, y: 250 },
            { x: 400, y: 350 },
            { x: 380, y: 330 },
        ],
        numberOfPoints: 5,
    };
    const createPolygonTrackPoints = {
        reDraw: false,
        type: 'Track',
        switchLabel: false,
        pointsMap: [
            { x: 500, y: 200 },
            { x: 550, y: 200 },
            { x: 550, y: 250 },
            { x: 500, y: 350 },
            { x: 480, y: 330 },
        ],
        numberOfPoints: 5,
    };
    const createPolygonShapeSwitchLabel = {
        reDraw: false,
        type: 'Shape',
        switchLabel: true,
        labelName: newLabelName,
        pointsMap: [
            { x: 600, y: 200 },
            { x: 650, y: 200 },
            { x: 650, y: 250 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolygonTrackSwitchLabel = {
        reDraw: false,
        type: 'Track',
        switchLabel: true,
        labelName: newLabelName,
        pointsMap: [
            { x: 700, y: 200 },
            { x: 750, y: 200 },
            { x: 750, y: 250 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Add new label', () => {
            cy.contains('button', 'Add label').click();
            cy.get('[placeholder="Label name"]').type(newLabelName);
            cy.contains('button', 'Done').click();
        });
        it('Open a job', () => {
            cy.openJob();
        });
        it('Draw a polygon shape, track', () => {
            cy.createPolygon(createPolygonShape);
            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-1')
                .should('contain', '1')
                .and('contain', 'POLYGON SHAPE')
                .within(() => {
                    cy.get('.ant-select-selection-selected-value').should('contain', labelName);
                });
            cy.createPolygon(createPolygonTrack);
            cy.get('#cvat_canvas_shape_2').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-2')
                .should('contain', '2')
                .and('contain', 'POLYGON TRACK')
                .within(() => {
                    cy.get('.ant-select-selection-selected-value').should('contain', labelName);
                });
        });
        it('Draw a polygon shape, track with use parameter "number of points"', () => {
            cy.createPolygon(createPolygonShapePoints);
            cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('contain', '3')
                .and('contain', 'POLYGON SHAPE')
                .within(() => {
                    cy.get('.ant-select-selection-selected-value').should('contain', labelName);
                });
            cy.createPolygon(createPolygonTrackPoints);
            cy.get('#cvat_canvas_shape_4').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-4')
                .should('contain', '4')
                .and('contain', 'POLYGON TRACK')
                .within(() => {
                    cy.get('.ant-select-selection-selected-value').should('contain', labelName);
                });
        });
        it('Draw a polygon shape, track with second label', () => {
            cy.createPolygon(createPolygonShapeSwitchLabel);
            cy.get('#cvat_canvas_shape_5').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-5')
                .should('contain', '5')
                .and('contain', 'POLYGON SHAPE')
                .within(() => {
                    cy.get('.ant-select-selection-selected-value').should('contain', newLabelName);
                });
            cy.createPolygon(createPolygonTrackSwitchLabel);
            cy.get('#cvat_canvas_shape_6').should('exist').and('be.visible');
            cy.get('#cvat-objects-sidebar-state-item-6')
                .should('contain', '6')
                .and('contain', 'POLYGON TRACK')
                .within(() => {
                    cy.get('.ant-select-selection-selected-value').should('contain', newLabelName);
                });
        });
    });
});
