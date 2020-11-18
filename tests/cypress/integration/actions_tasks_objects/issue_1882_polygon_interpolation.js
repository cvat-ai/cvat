// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context("The points of the previous polygon mustn't appear while polygon's interpolation.", () => {
    const issueId = '1882';
    const createPolygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName: labelName,
        pointsMap: [
            { x: 309, y: 431 },
            { x: 360, y: 500 },
            { x: 320, y: 300 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const reDrawPolygonTrack = {
        reDraw: true,
        type: 'Track',
        labelName: labelName,
        pointsMap: [
            { x: 359, y: 431 },
            { x: 410, y: 500 },
            { x: 370, y: 300 },
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
        it('Redraw the polygon', () => {
            cy.get('#cvat_canvas_shape_1')
                .trigger('mousemove', { force: true })
                .trigger('keydown', { key: 'n', shiftKey: true })
                .trigger('keyup', { force: true }, { key: 'n', shiftKey: true });
            cy.createPolygon(reDrawPolygonTrack);
        });
        it('Activate auto bordering mode', () => {
            cy.openSettings();
            cy.get('.ant-modal-content').within(() => {
                cy.contains('Workspace').click();
                cy.get('.cvat-workspace-settings-autoborders').within(() => {
                    cy.get('[type="checkbox"]').check();
                });
            });
            cy.closeSettings();
        });
        it('Old points invisible', () => {
            cy.get('.cvat_canvas_autoborder_point').should('not.exist');
        });
    });
});
