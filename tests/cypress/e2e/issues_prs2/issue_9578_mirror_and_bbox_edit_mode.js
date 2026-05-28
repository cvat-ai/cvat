// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Feature: Mirroring and BBox Edit Mode', () => {
    const issueId = '9578';

    const createPolygonPoints = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [
            { x: 300, y: 300 },
            { x: 500, y: 300 },
            { x: 400, y: 500 },
        ],
    };

    const createPolylinePoints = {
        type: 'Shape',
        labelName: labelName,
        pointsMap: [
            { x: 600, y: 300 },
            { x: 700, y: 400 },
            { x: 600, y: 500 },
        ],
    };

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
    });

    describe(`Testing PR "${issueId}": Bounding Box Edit Mode`, () => {
        it('Create a polygon shape', () => {
            cy.createPolygon(createPolygonPoints);
        });

        it('Activate BBox Edit Mode via the sidebar button', () => {
            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
            cy.get('.cvat-object-item-button-bbox-mode').click();
            cy.get('.cvat_canvas_active_bbox').should('exist');
        });

        it('Deactivate BBox Edit Mode via shortcut "s"', () => {
            cy.get('body').type('s');
            cy.get('.cvat_canvas_active_bbox').should('not.exist');
        });

        it('Scale the polygon by dragging the BBox corner', () => {
            cy.get('#cvat_canvas_shape_1').click();
            cy.get('body').type('s');

            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').then((originalPoints) => {
                cy.get('.svg_select_points_rb').trigger('mousedown', { button: 0 });
                cy.get('#cvat_canvas_wrapper').trigger('mousemove', { clientX: 600, clientY: 600 });
                cy.get('#cvat_canvas_wrapper').trigger('mouseup');

                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should((scaledPoints) => {
                    expect(scaledPoints).not.to.equal(originalPoints);
                });
            });
            cy.get('body').type('s');
        });

        it('Rotate the polygon using the BBox rotation handle', () => {
            cy.get('#cvat_canvas_shape_1').click();
            cy.get('body').type('s');

            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').then((originalPoints) => {
                cy.get('.svg_select_points_rot').trigger('mousedown', { button: 0 });

                cy.get('#cvat_canvas_wrapper').trigger('mousemove', { clientX: 450, clientY: 200 });
                cy.get('#cvat_canvas_wrapper').trigger('mouseup');

                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should((rotatedPoints) => {
                    expect(rotatedPoints).not.to.equal(originalPoints);
                });
            });

            cy.get('body').type('s');
        });
    });

    describe(`Testing PR "${issueId}": Mirroring Math and History`, () => {
        it('Mirror the polygon horizontally via shortcut "Shift+H"', () => {
            cy.get('#cvat_canvas_shape_1').click();
            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').then((originalPoints) => {
                cy.get('body').type('{shift}h');
                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should('not.equal', originalPoints);
            });
        });

        it('Verify undo history (Ctrl+Z) reverts the mirroring', () => {
            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').then((currentPoints) => {
                cy.get('body').type('{ctrl}z');
                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should('not.equal', currentPoints);
            });
        });

        it('Verify redo history (Ctrl+Shift+Z) reapplies the mirroring', () => {
            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').then((currentPoints) => {
                cy.get('body').type('{ctrl}{shift}z');
                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should('not.equal', currentPoints);
            });
        });

        it('Mirror the polygon vertically via the Object Item Menu', () => {
            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').then((originalPoints) => {
                cy.get('#cvat-objects-sidebar-state-item-1').find('.ant-dropdown-trigger').click({ force: true });
                cy.get('.cvat-object-item-menu-mirror-vertical').click();

                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should('not.equal', originalPoints);
            });
        });

        it('Mirror the polygon horizontally via the Object Item Menu', () => {
            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').then((originalPoints) => {
                cy.get('#cvat-objects-sidebar-state-item-1').find('.ant-dropdown-trigger').click({ force: true });

                cy.get('.cvat-object-item-menu-mirror-horizontal').click();

                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should('not.equal', originalPoints);
            });
        });
    });

    describe(`Testing PR "${issueId}": Polyline Support`, () => {
        it('Create a polyline shape', () => {
            cy.createPolyline(createPolylinePoints);
        });

        it('Scale the polyline using BBox edit mode', () => {
            cy.get('#cvat_canvas_shape_2').click();
            cy.get('body').type('s');

            cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').then((originalPoints) => {
                cy.get('.svg_select_points_rb').trigger('mousedown', { button: 0 });
                cy.get('#cvat_canvas_wrapper').trigger('mousemove', { clientX: 750, clientY: 550 });
                cy.get('#cvat_canvas_wrapper').trigger('mouseup');

                cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').should((scaledPoints) => {
                    expect(scaledPoints).not.to.equal(originalPoints);
                });
            });
            cy.get('body').type('s');
        });

        it('Mirror the polyline vertically', () => {
            cy.get('#cvat_canvas_shape_2').click({ force: true });
            cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').then((originalPoints) => {
                cy.get('body').type('{shift}v');
                cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').should('not.equal', originalPoints);
            });
        });

        it('Scale the polyline using the right-middle BBox handle', () => {
            cy.get('#cvat_canvas_shape_2').click({ force: true });
            cy.get('body').type('s');

            cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').then((originalPoints) => {
                cy.get('.svg_select_points_r').trigger('mousedown', { button: 0 });
                cy.get('#cvat_canvas_wrapper').trigger('mousemove', { clientX: 850, clientY: 400 });
                cy.get('#cvat_canvas_wrapper').trigger('mouseup');

                cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').should((scaledPoints) => {
                    expect(scaledPoints).not.to.equal(originalPoints);
                });
            });
            cy.get('body').type('s');
        });

        it('Rotate the polyline using the BBox rotation handle', () => {
            cy.get('#cvat_canvas_shape_2').click({ force: true });
            cy.get('body').type('s');

            cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').then((originalPoints) => {
                cy.get('.svg_select_points_rot').trigger('mousedown', { button: 0 });
                cy.get('#cvat_canvas_wrapper').trigger('mousemove', { clientX: 500, clientY: 150 });
                cy.get('#cvat_canvas_wrapper').trigger('mouseup');

                cy.get('#cvat_canvas_shape_2').invoke('attr', 'points').should((rotatedPoints) => {
                    expect(rotatedPoints).not.to.equal(originalPoints);
                });
            });
            cy.get('body').type('s');
        });
    });

    describe(`Testing PR "${issueId}": Persistence`, () => {
        it('Save the job, reload the page, and verify the shapes retain modifications', () => {
            cy.get('.cvat-canvas-container').click();

            cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').as('pointsBeforeSave');

            cy.saveJob();

            cy.reload();
            cy.get('.cvat-canvas-container').should('exist');

            cy.get('@pointsBeforeSave').then((pointsBeforeSave) => {
                cy.get('#cvat_canvas_shape_1').invoke('attr', 'points').should((pointsAfterReload) => {
                    expect(pointsAfterReload).to.equal(pointsBeforeSave);
                });
            });
        });
    });
});
