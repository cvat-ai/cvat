// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Manipulations with masks', { scrollBehavior: false }, () => {
    const taskName = 'Basic actions with masks';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const drawingActions = [{
        method: 'brush',
        coordinates: [[300, 300], [700, 300], [700, 700], [300, 700]],
    }, {
        method: 'polygon-plus',
        coordinates: [[450, 210], [650, 400], [450, 600], [260, 400]],
    }, {
        method: 'brush-size',
        value: 150,
    }, {
        method: 'eraser',
        coordinates: [[500, 500]],
    }, {
        method: 'brush-size',
        value: 10,
    }, {
        method: 'polygon-minus',
        coordinates: [[450, 400], [600, 400], [450, 550], [310, 400]],
    }];

    const editingActions = [{
        method: 'polygon-minus',
        coordinates: [[50, 400], [800, 400], [800, 800], [50, 800]],
    }];

    let taskID = null;
    let jobID = null;

    function drawMask(instructions) {
        for (const instruction of instructions) {
            const { method } = instruction;
            if (method === 'brush-size') {
                const { value } = instruction;
                cy.get('.cvat-brush-tools-brush').click();
                cy.get('.cvat-brush-tools-brush-size').within(() => {
                    cy.get('input').clear().type(`${value}`);
                });
            } else {
                const { coordinates } = instruction;
                if (['brush', 'eraser'].includes(method)) {
                    if (method === 'eraser') {
                        cy.get('.cvat-brush-tools-eraser').click();
                    } else {
                        cy.get('.cvat-brush-tools-brush').click();
                    }

                    cy.get('.cvat-canvas-container').then(([$canvas]) => {
                        const [initX, initY] = coordinates[0];
                        cy.wrap($canvas).trigger('mousemove', { clientX: initX, clientY: initY, bubbles: true });
                        cy.wrap($canvas).trigger('mousedown', {
                            clientX: initX, clientY: initY, button: 0, bubbles: true,
                        });
                        for (const coord of coordinates) {
                            const [clientX, clientY] = coord;
                            cy.wrap($canvas).trigger('mousemove', { clientX, clientY, bubbles: true });
                        }
                        cy.wrap($canvas).trigger('mousemove', { clientX: initX, clientY: initY, bubbles: true });
                        cy.wrap($canvas).trigger('mouseup', { bubbles: true });
                    });
                } else if (['polygon-plus', 'polygon-minus'].includes(method)) {
                    if (method === 'polygon-plus') {
                        cy.get('.cvat-brush-tools-polygon-plus').click();
                    } else {
                        cy.get('.cvat-brush-tools-polygon-minus').click();
                    }

                    cy.get('.cvat-canvas-container').then(($canvas) => {
                        for (const [x, y] of coordinates) {
                            cy.wrap($canvas).click(x, y);
                        }
                    });
                }
            }
        }
    }

    function startDrawing() {
        cy.get('.cvat-draw-mask-control ').trigger('mouseover');
        cy.get('.cvat-draw-mask-popover').should('exist').and('be.visible').within(() => {
            cy.get('button').click();
        });
        cy.get('.cvat-brush-tools-toolbox').should('exist').and('be.visible');
    }

    function finishDrawing() {
        cy.get('.cvat-brush-tools-brush').click();
        cy.get('.cvat-brush-tools-finish').click();
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [{ name: 'mask label', attributes: [], type: 'any' }],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobID;
        }).then(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskID}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
    });

    beforeEach(() => {
        cy.removeAnnotations();
        cy.goCheckFrameNumber(0);
    });

    describe('Draw a couple of masks masks', () => {
        it('Drawing a couple of masks. Save job, reopen job, masks must exist', () => {
            startDrawing();
            drawMask(drawingActions);
            cy.get('.cvat-brush-tools-finish').click();
            cy.get('.cvat-brush-tools-continue').click();
            cy.get('.cvat-brush-tools-toolbox').should('exist').and('be.visible');
            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');

            // it is expected, that after clicking "continue", brush tools are still opened
            drawMask(drawingActions);
            finishDrawing();
            cy.get('.cvat-brush-tools-toolbox').should('not.be.visible');

            cy.saveJob();
            cy.reload();

            for (const id of [1, 2]) {
                cy.get(`#cvat_canvas_shape_${id}`).should('exist').and('be.visible');
            }
            cy.removeAnnotations();
        });

        it('Propagate mask to another frame', () => {
            startDrawing();
            drawMask(drawingActions);
            finishDrawing();

            cy.get('#cvat-objects-sidebar-state-item-1').find('[aria-label="more"]').trigger('mouseover');
            cy.get('.cvat-object-item-menu').within(() => {
                cy.contains('button', 'Propagate').click();
            });
            cy.get('.cvat-propagate-confirm-up-to-input').find('input')
                .should('have.attr', 'value', serverFiles.length - 1);
            cy.contains('button', 'Yes').click();
            for (let i = 1; i < serverFiles.length; i++) {
                cy.goCheckFrameNumber(i);
                cy.get('.cvat_canvas_shape').should('exist').and('be.visible');
            }
        });

        it('Copy mask to another frame', () => {
            startDrawing();
            drawMask(drawingActions);
            finishDrawing();

            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('[aria-label="more"]').trigger('mouseover');
            });
            cy.get('.cvat-object-item-menu').last().should('be.visible').contains('button', 'Make a copy').click();
            cy.goCheckFrameNumber(serverFiles.length - 1);
            cy.get('.cvat-canvas-container').click();
            cy.get('#cvat_canvas_shape_2').should('exist').and('be.visible');
        });

        it('Editing a drawn mask', () => {
            startDrawing();
            drawMask(drawingActions);
            finishDrawing();

            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('[aria-label="more"]').trigger('mouseover');
            });
            cy.get('.cvat-object-item-menu').last().should('be.visible').contains('button', 'Edit').click();
            drawMask(editingActions);
            finishDrawing();
        });
    });
});
