// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Rubber-band multi-selection in cursor mode', { scrollBehavior: false }, () => {
    const taskName = 'Cursor multi-selection';
    const labelName = 'rectangle label';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg'];

    const rectangles = [
        {
            labelName, points: 'By 2 Points', type: 'Shape', firstX: 150, firstY: 150, secondX: 250, secondY: 250,
        },
        {
            labelName, points: 'By 2 Points', type: 'Shape', firstX: 350, firstY: 150, secondX: 450, secondY: 250,
        },
        {
            labelName, points: 'By 2 Points', type: 'Shape', firstX: 550, firstY: 350, secondX: 650, secondY: 450,
        },
    ];

    let taskId = null;
    let jobId = null;

    function selectionBox(firstX, firstY, lastX, lastY) {
        // hold the multi-selection modifier (default shift) and drag with the left mouse button
        cy.get('.cvat-canvas-container')
            .trigger('mousedown', firstX, firstY, { button: 0, shiftKey: true });
        cy.get('.cvat-canvas-container')
            .trigger('mousemove', lastX, lastY, { shiftKey: true });
        cy.get('.cvat-canvas-container')
            .trigger('mouseup', lastX, lastY, { button: 0, shiftKey: true });
    }

    function selectFirstTwoRectangles() {
        // box covers the first two rectangles, but not the third
        selectionBox(120, 120, 480, 300);
        cy.get('.cvat_canvas_shape_selected_object').should('have.length', 2);
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'rectangle' }],
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
            taskId = response.taskId;
            [jobId] = response.jobIds;
        }).then(() => {
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    after(() => {
        cy.logout();
        cy.task('getAuthHeaders').then((authHeaders) => {
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskId}`,
                headers: authHeaders,
            });
        });
    });

    beforeEach(() => {
        cy.removeAnnotations();
        cy.goCheckFrameNumber(0);
        rectangles.forEach((rectangle) => cy.createRectangle(rectangle));
    });

    describe('Making a selection', () => {
        it('Modifier + drag selects intersecting shapes, indicated on canvas and in the sidebar', () => {
            selectFirstTwoRectangles();
            cy.get('.cvat-objects-sidebar-state-item-multi-selected').should('have.length', 2);
        });

        it('A click outside of the selected shapes resets the selection', () => {
            selectFirstTwoRectangles();
            cy.get('.cvat-canvas-container').click(800, 600);
            cy.get('.cvat_canvas_shape_selected_object').should('have.length', 0);
            cy.get('.cvat-objects-sidebar-state-item-multi-selected').should('have.length', 0);
        });
    });

    describe('Manipulating the selection', () => {
        it('Dragging one selected shape moves the whole selection, single undo restores it', () => {
            selectFirstTwoRectangles();

            const before = {};
            cy.get('.cvat_canvas_shape_selected_object').each(($shape) => {
                before[$shape.attr('id')] = +$shape.attr('x');
            });

            // hover a selected shape and drag whichever selected shape gets activated
            cy.get('.cvat_canvas_shape_selected_object').first().trigger('mousemove');
            cy.get('.cvat_canvas_shape_selected_object').first().trigger('mouseover');
            cy.get('.cvat_canvas_shape_activated').should('exist');
            cy.get('.cvat_canvas_shape_activated').trigger('mousedown', { which: 1 });
            cy.get('.cvat-canvas-container').trigger('mousemove', 300, 350);
            cy.get('.cvat-canvas-container').trigger('mouseup', 300, 350);

            cy.get('.cvat_canvas_shape_selected_object').each(($shape) => {
                expect(+$shape.attr('x')).to.not.equal(before[$shape.attr('id')]);
            });

            cy.get('body').type('{ctrl}z');
            cy.get('.cvat_canvas_shape_selected_object').each(($shape) => {
                expect(+$shape.attr('x')).to.equal(before[$shape.attr('id')]);
            });
        });

        it('Copy and paste duplicates the whole selection, single undo removes it', () => {
            cy.get('.cvat_canvas_shape').should('have.length', 3);
            selectFirstTwoRectangles();

            cy.get('body').type('{ctrl}c');
            cy.get('body').type('{ctrl}v');

            // two extra shapes are created preserving relative geometry, and become the new selection
            cy.get('.cvat_canvas_shape').should('have.length', 5);
            cy.get('.cvat_canvas_shape_selected_object').should('have.length', 2);

            cy.get('body').type('{ctrl}z');
            cy.get('.cvat_canvas_shape').should('have.length', 3);
        });

        it('The clipboard survives frame changes', () => {
            selectFirstTwoRectangles();
            cy.get('body').type('{ctrl}c');

            cy.goCheckFrameNumber(1);
            // the frame selector keeps the focus, but shortcuts are ignored inside inputs
            cy.get('.cvat-player-frame-selector input[role="spinbutton"]').blur();
            cy.get('.cvat_canvas_shape').should('have.length', 0);
            cy.get('body').type('{ctrl}v');
            cy.get('.cvat_canvas_shape').should('have.length', 2);

            cy.goCheckFrameNumber(0);
            cy.get('.cvat_canvas_shape').should('have.length', 3);
        });

        it('Pressing delete removes the whole selection, single undo restores it', () => {
            selectFirstTwoRectangles();

            cy.get('body').type('{del}');
            cy.get('.cvat_canvas_shape').should('have.length', 1);
            cy.get('.cvat_canvas_shape_selected_object').should('have.length', 0);

            cy.get('body').type('{ctrl}z');
            cy.get('.cvat_canvas_shape').should('have.length', 3);
        });
    });
});
