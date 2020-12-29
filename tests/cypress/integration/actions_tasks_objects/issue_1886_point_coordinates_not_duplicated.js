// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, advancedConfigurationParams, labelName } from '../../support/const';

context("Point coordinates are not duplicated while polygon's interpolation.", () => {
    const issueId = '1886';
    let pointsСoordinates = [];
    const createPolygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName: labelName,
        pointsMap: [
            { x: 300, y: 450 },
            { x: 400, y: 450 },
            { x: 400, y: 550 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a polygon', () => {
            cy.createPolygon(createPolygonTrack);
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'POLYGON TRACK');
        });
        it('Go next with a step', () => {
            cy.get('.cvat-player-forward-button').click();
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', advancedConfigurationParams.segmentSize - 1);
            });
        });
        it('Set a keyframe for the polygon', () => {
            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('[data-icon="star"]').click();
            });
        });
        it('Go to previous frame  and getting point`s coordinates', () => {
            cy.get('.cvat-player-previous-button').click();
            cy.get('.cvat-player-frame-selector').within(() => {
                cy.get('input[role="spinbutton"]').should('have.value', advancedConfigurationParams.segmentSize - 2);
            });
            cy.get('#cvat_canvas_shape_1')
                .should('have.prop', 'animatedPoints')
                .then(($pointsСoordinates) => {
                    for (let i of $pointsСoordinates) {
                        pointsСoordinates.push(`${i.x}, ${i.y}`);
                    }
                });
        });
        it('The coordinates of the points are not duplicated', () => {
            for (let i = 0; i < pointsСoordinates.length - 1; i++) {
                cy.expect(pointsСoordinates[i]).not.equal(pointsСoordinates[i + 1]);
            }
        });
    });
});
