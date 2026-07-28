// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context("The points of the previous polygon mustn't appear while polygon's interpolation.", () => {
    const issueId = '1882';
    const createPolygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName,
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
        labelName,
        pointsMap: [
            { x: 359, y: 431 },
            { x: 410, y: 500 },
            { x: 370, y: 300 },
        ],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a polygon', () => {
            cy.createPolygon(createPolygonTrack);
            cy.get('#cvat-objects-sidebar-state-item-1').should('contain', '1').and('contain', 'POLYGON TRACK');
        });
        it('Redraw the polygon', () => {
            const keyCodeN = 78;
            cy.get('#cvat_canvas_shape_1').trigger('mousemove', { force: true });
            cy.get('#cvat_canvas_shape_1').trigger('keydown', { keyCode: keyCodeN, code: 'KeyN', shiftKey: true });
            cy.get('#cvat_canvas_shape_1').trigger('keyup', {
                force: true, keyCode: keyCodeN, code: 'KeyN', shiftKey: true,
            });
            cy.createPolygon(reDrawPolygonTrack);
        });
        it('Activate snap to contour mode via snap tools control', () => {
            cy.get('.cvat-snap-tools-control').click();
            cy.get('.cvat-snap-tools-control').should('have.class', 'ant-popover-open');
            cy.get('.cvat-snap-tools-control-popover').should('be.visible');
            cy.get('.cvat-snap-tools-control-popover').within(() => {
                cy.get('.cvat-snap-to-contour-button').click();
                cy.get('.cvat-snap-to-contour-button').should('have.class', 'cvat-snap-tool-active');
            });
            cy.get('body').click();
        });
        it('Old points invisible', () => {
            cy.get('.cvat_canvas_autoborder_point').should('not.exist');
        });
    });
});
