// Copyright (C) 2022-2024 CVAT.ai Corporation
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
            [jobID] = response.jobIDs;
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

    describe('Tests to make sure that basic features work with masks', () => {
        beforeEach(() => {
            cy.removeAnnotations();
            cy.goCheckFrameNumber(0);
        });

        it('Drawing a couple of masks. Save job, reopen job, masks must exist', () => {
            cy.startMaskDrawing();
            cy.drawMask(drawingActions);
            cy.get('.cvat-brush-tools-finish').click();
            cy.get('.cvat-brush-tools-continue').click();
            cy.get('.cvat-brush-tools-toolbox').should('exist').and('be.visible');
            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');

            // it is expected, that after clicking "continue", brush tools are still opened
            cy.drawMask(drawingActions);
            cy.finishMaskDrawing();
            cy.get('.cvat-brush-tools-toolbox').should('not.be.visible');

            cy.saveJob();
            cy.reload();

            for (const id of [1, 2]) {
                cy.get(`#cvat_canvas_shape_${id}`).should('exist').and('be.visible');
            }
            cy.removeAnnotations();
        });

        it('Propagate mask to another frame', () => {
            cy.startMaskDrawing();
            cy.drawMask(drawingActions);
            cy.finishMaskDrawing();

            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Propagate');
            cy.get('.cvat-propagate-confirm-up-to-input').find('input')
                .should('have.attr', 'value', serverFiles.length - 1);
            cy.contains('button', 'Yes').click();
            for (let i = 1; i < serverFiles.length; i++) {
                cy.goCheckFrameNumber(i);
                cy.get('.cvat_canvas_shape').should('exist').and('be.visible');
            }
        });

        it('Copy mask to another frame', () => {
            cy.startMaskDrawing();
            cy.drawMask(drawingActions);
            cy.finishMaskDrawing();

            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Make a copy');
            cy.goCheckFrameNumber(serverFiles.length - 1);
            cy.get('.cvat-canvas-container').click();
            cy.get('#cvat_canvas_shape_2').should('exist').and('be.visible');
        });

        it('Check hidden mask still invisible after changing frame/opacity', () => {
            cy.startMaskDrawing();
            cy.drawMask(drawingActions);
            cy.finishMaskDrawing();

            cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
                cy.get('.cvat-object-item-button-hidden')
                    .should('exist').and('be.visible').click();
                cy.get('.cvat-object-item-button-hidden')
                    .should('have.class', 'cvat-object-item-button-hidden-enabled');
            });

            cy.goCheckFrameNumber(serverFiles.length - 1);
            cy.goCheckFrameNumber(0);

            cy.get('.cvat-appearance-opacity-slider').click('right');
            cy.get('.cvat-appearance-opacity-slider').click('center');
            cy.get('#cvat_canvas_shape_1')
                .should('exist').and('have.class', 'cvat_canvas_hidden').and('not.be.visible');
        });

        it('Editing a drawn mask', () => {
            cy.startMaskDrawing();
            cy.drawMask(drawingActions);
            cy.finishMaskDrawing();

            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Edit');
            cy.drawMask(editingActions);
            cy.finishMaskDrawing();
        });

        it('Underlying pixels are removed on enabling "Remove underlying pixels" tool', () => {
            const mask1 = [{
                method: 'brush',
                coordinates: [[450, 250], [600, 400]],
            }];
            const mask2 = [{
                method: 'brush',
                coordinates: [[450, 250], [525, 325]],
            }];

            cy.startMaskDrawing();
            cy.drawMask(mask1);
            cy.get('.cvat-brush-tools-continue').click();

            cy.drawMask(mask2);
            cy.get('.cvat-brush-tools-underlying-pixels').click();
            cy.get('.cvat-brush-tools-underlying-pixels').should('have.class', 'cvat-brush-tools-active-tool');
            cy.finishMaskDrawing();

            cy.get('#cvat-objects-sidebar-state-item-2').within(() => {
                cy.get('.cvat-object-item-button-hidden').click();
            });

            cy.get('.cvat-canvas-container').then(([$canvas]) => {
                cy.wrap($canvas).trigger('mousemove', { clientX: 450, clientY: 250 });
                cy.get('#cvat_canvas_shape_1').should('not.have.class', 'cvat_canvas_shape_activated');

                cy.wrap($canvas).trigger('mousemove', { clientX: 550, clientY: 350 });
                cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            });

            cy.startMaskDrawing();
            cy.get('.cvat-brush-tools-underlying-pixels').click();
            cy.get('.cvat-brush-tools-underlying-pixels').should('not.have.class', 'cvat-brush-tools-active-tool');
            cy.finishMaskDrawing();
        });
    });

    describe('Tests to make sure that empty masks cannot be created', () => {
        beforeEach(() => {
            cy.removeAnnotations();
            cy.saveJob('PUT');
        });

        function checkEraseTools(baseTool = '.cvat-brush-tools-brush', disabled = true) {
            cy.get(baseTool).should('have.class', 'cvat-brush-tools-active-tool');

            const condition = disabled ? 'be.disabled' : 'not.be.disabled';
            cy.get('.cvat-brush-tools-eraser').should(condition);
            cy.get('.cvat-brush-tools-polygon-minus').should(condition);
        }

        function checkMaskNotEmpty(selector) {
            cy.get(selector).should('exist').and('be.visible');
            cy.get(selector)
                .should('have.attr', 'height')
                .then((height) => {
                    expect(+height).to.be.gt(1);
                });
            cy.get(selector)
                .should('have.attr', 'width')
                .then((width) => {
                    expect(+width).to.be.gt(1);
                });
        }

        it('Erase tools are locked when nothing to erase', () => {
            const erasedMask = [{
                method: 'brush',
                coordinates: [[450, 250], [600, 400], [450, 550], [300, 400]],
            }, {
                method: 'polygon-minus',
                coordinates: [[100, 100], [700, 100], [700, 700], [100, 700]],
            }];

            cy.startMaskDrawing();
            checkEraseTools();
            cy.drawMask(erasedMask);

            cy.get('.cvat-brush-tools-brush').click();
            checkEraseTools();

            cy.finishMaskDrawing();
            cy.get('#cvat_canvas_shape_1').should('not.exist');
        });

        it('Drawing a mask, finish with erasing tool. On new mask drawing tool is reset', () => {
            const masks = [[{
                method: 'brush',
                coordinates: [[450, 250], [600, 400], [450, 550], [300, 400]],
            }, {
                method: 'polygon-minus',
                coordinates: [[100, 100], [400, 100], [400, 400], [100, 400]],
            }], [{
                method: 'brush',
                coordinates: [[550, 350], [700, 500], [550, 650], [400, 500]],
            }, {
                method: 'eraser',
                coordinates: [[550, 350]],
            }]];

            for (const [index, mask] of masks.entries()) {
                cy.startMaskDrawing();
                cy.drawMask(mask);
                cy.finishMaskDrawing();

                cy.get(`#cvat_canvas_shape_${index + 1}`).should('exist').and('be.visible');

                cy.startMaskDrawing();
                checkEraseTools();
                cy.finishMaskDrawing();
            }
        });

        it('Empty masks are deleted using remove underlying pixels feature', () => {
            const masks = [[{
                method: 'brush',
                coordinates: [[150, 150], [270, 270]],
            }], [{
                method: 'brush',
                coordinates: [[350, 350], [370, 370]],
            }], [{
                method: 'polygon-plus',
                coordinates: [[100, 100], [400, 100], [400, 400], [100, 400]],
            }]];

            cy.startMaskDrawing();
            cy.get('.cvat-brush-tools-underlying-pixels').click();
            cy.get('.cvat-brush-tools-underlying-pixels').should('have.class', 'cvat-brush-tools-active-tool');
            cy.finishMaskDrawing();

            for (const [index, mask] of masks.entries()) {
                cy.startMaskDrawing();
                cy.drawMask(mask);
                cy.finishMaskDrawing();

                cy.get(`#cvat_canvas_shape_${index + 1}`).should('exist').and('be.visible');
            }

            // Fist mask is updated, second mask is removed after third mask is drawn
            cy.contains('Some objects were deleted').should('exist').and('be.visible');
            for (const id of [1, 3]) {
                cy.get(`#cvat_canvas_shape_${id}`).should('exist').and('be.visible');
            }
            cy.get('#cvat_canvas_shape_2').should('not.exist');
            cy.saveJob('PATCH', 200, 'removeUnderlyingPixelsUndoRedo');

            // Undo creating mask, second mask is restored
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            for (const id of [1, 2]) {
                cy.get(`#cvat_canvas_shape_${id}`).should('exist').and('be.visible');
            }
            cy.saveJob('PATCH', 200, 'removeUnderlyingPixelsUndoRedo');

            // Redo creating mask, second mask is removed
            cy.contains('.cvat-annotation-header-button', 'Redo').click();
            for (const id of [1, 3]) {
                cy.get(`#cvat_canvas_shape_${id}`).should('exist').and('be.visible');
            }
            cy.get('#cvat_canvas_shape_2').should('not.exist');
            cy.saveJob('PATCH', 200, 'removeUnderlyingPixelsUndoRedo');

            cy.get('.cvat-notification-notice-save-annotations-failed').should('not.exist');
        });

        it('Erasing a mask during editing is not allowed', () => {
            const mask = [{
                method: 'brush',
                coordinates: [[450, 250], [600, 400], [450, 550], [300, 400]],
            }];
            const eraseAction = [{
                method: 'polygon-minus',
                coordinates: [[100, 100], [700, 100], [700, 700], [100, 700]],
            }];

            cy.startMaskDrawing();
            cy.drawMask(mask);
            cy.finishMaskDrawing();

            cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-1', 'Edit');
            cy.drawMask(eraseAction);
            cy.finishMaskDrawing();

            checkMaskNotEmpty('#cvat_canvas_shape_1');
        });
    });
});
