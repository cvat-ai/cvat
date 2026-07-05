// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Keyboard shortcuts to resize a rectangle without pointing and clicking (issue 10738)', () => {
    const issueId = '10738';

    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: 'car',
        firstX: 250,
        firstY: 350,
        secondX: 450,
        secondY: 550,
    };

    before(() => {
        cy.prepareUserSession();
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
    });

    beforeEach(() => {
        // Make sure the rectangle is the "active" shape before every test,
        // the same way the user would click on it to select it first.
        cy.get('#cvat_canvas_shape_1').click();
    });

    describe(`Testing issue ${issueId}`, () => {
        it('Pressing "w" grabs the top-left corner and it follows the mouse', () => {
            cy.get('#cvat_canvas_shape_1').then(($shape) => {
                const before = $shape[0].getBoundingClientRect();
                const targetX = before.left - 40;
                const targetY = before.top - 40;

                // Move the mouse somewhere far from the actual handle first.
                // If the corner still ends up here, we know it wasn't a real drag on the handle.
                cy.get('.cvat-canvas-container').trigger('mousemove', { clientX: targetX, clientY: targetY });

                cy.get('body').trigger('keydown', { code: 'KeyW', key: 'w' });
                cy.get('.cvat-canvas-container').trigger('mousemove', { clientX: targetX, clientY: targetY });
                cy.get('body').trigger('keyup', { code: 'KeyW', key: 'w' });

                cy.get('#cvat_canvas_shape_1').should(($resized) => {
                    const after = $resized[0].getBoundingClientRect();
                    expect(after.left).to.be.lessThan(before.left);
                    expect(after.top).to.be.lessThan(before.top);
                });
            });
        });

        it('Pressing "t" grabs the bottom-right corner and it follows the mouse', () => {
            cy.get('#cvat_canvas_shape_1').then(($shape) => {
                const before = $shape[0].getBoundingClientRect();
                const targetX = before.right + 40;
                const targetY = before.bottom + 40;

                cy.get('.cvat-canvas-container').trigger('mousemove', { clientX: targetX, clientY: targetY });

                cy.get('body').trigger('keydown', { code: 'KeyT', key: 't' });
                cy.get('.cvat-canvas-container').trigger('mousemove', { clientX: targetX, clientY: targetY });
                cy.get('body').trigger('keyup', { code: 'KeyT', key: 't' });

                cy.get('#cvat_canvas_shape_1').should(($resized) => {
                    const after = $resized[0].getBoundingClientRect();
                    expect(after.right).to.be.greaterThan(before.right);
                    expect(after.bottom).to.be.greaterThan(before.bottom);
                });
            });
        });

//         it('Releasing an unrelated key does not cancel an in-progress keyboard resize', () => {
//             cy.get('#cvat_canvas_shape_1').then(($shape) => {
//                 const before = $shape[0].getBoundingClientRect();
//                 const targetX = before.left - 40;
//                 const targetY = before.top - 40;
//
//                 cy.get('body').trigger('keydown', { code: 'KeyW', key: 'w' });
//
//                 // Releasing some other key should be a no-op for the resize in progress
//                 cy.get('body').trigger('keyup', { code: 'KeyA', key: 'a' });
//
//                 cy.get('.cvat-canvas-container').trigger('mousemove', { clientX: targetX, clientY: targetY });
//
//                 cy.get('#cvat_canvas_shape_1').should(($stillResizing) => {
//                     const mid = $stillResizing[0].getBoundingClientRect();
//                     // corner should have already started moving toward the mouse
//                     expect(mid.left).to.be.lessThan(before.left);
//                 });
//
//                 // now actually release "w" to finish and clean up state for later tests
//                 cy.get('body').trigger('keyup', { code: 'KeyW', key: 'w' });
//             });
//         });
    });

    after(() => {
        cy.removeAnnotations();
        cy.saveJob('PATCH', 200, 'commit');
        cy.goToTaskList();
    });
});