// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Regression tests', () => {
    let taskID = null;
    let jobID = null;

    const taskPayload = {
        name: 'Regression tests',
        labels: [{
            name: 'car',
            attributes: [],
            type: 'any',
        }],
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    const dataPayload = {
        server_files: ['bigArchive.zip'],
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };

    const rectanglePayload = {
        type: 'rectangle',
        occluded: false,
        labelName: taskPayload.labels[0].name,
    };

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        cy.headlessCreateTask(taskPayload, dataPayload).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;

            cy.headlessCreateObjects([{
                ...rectanglePayload,
                frame: 99,
                points: [250, 64, 491, 228],
                objectType: 'shape',
            }, {
                labelName: rectanglePayload.labelName,
                objectType: 'track',
                frame: 0,
                shapes: [{
                    type: rectanglePayload.type,
                    frame: 0,
                    occluded: rectanglePayload.occluded,
                    points: [10, 10, 30, 30],
                }],
            }], jobID);
        });
    });

    describe('UI does not crash', () => {
        beforeEach(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('not.exist');
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });

        it('UI does not crash if to activate an object while frame fetching', () => {
            cy.intercept('GET', '/api/jobs/**/data?**', (req) => {
                req.continue((res) => {
                    res.setDelay(3000);
                });
            }).as('delayedRequest');

            cy.get('.cvat-player-last-button').click();

            cy.get('#cvat-objects-sidebar-state-item-1').trigger('mousemove');
            cy.get('#cvat-objects-sidebar-state-item-1').should('not.have.class', 'cvat-objects-sidebar-state-active-item');

            cy.wait('@delayedRequest');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
        });

        it('UI does not crash if to navigate during an element resizing (issue 1922)', { scrollBehavior: false }, () => {
            cy.get('#cvat_canvas_shape_2').then(([el]) => {
                const rect = el.getBoundingClientRect();

                cy.get('body').trigger('mousemove', rect.x + rect.width / 2, rect.y + rect.height / 2);
                cy.get('#cvat_canvas_shape_2').should('have.class', 'cvat_canvas_shape_activated');

                cy.get('body').trigger('mousedown', rect.right, rect.bottom, { button: 0 });
                cy.get('body').trigger('mousemove', rect.right + 100, rect.bottom + 100);

                cy.get('body').type('f'); // go to next frame
                cy.get('body').trigger('mouseup');

                // Page with the error is missing
                cy.get('.cvat-global-boundary').should('not.exist');
                cy.checkFrameNum(0);
            });
        });
    });

    after(() => {
        if (taskID !== null) {
            cy.headlessDeleteTask(taskID);
        }
        cy.logout();
    });
});
