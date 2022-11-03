// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Manipulations with masks', () => {
    const taskName = 'Basic actions with masks';
    const coordinates = [[300, 300], [700, 300], [700, 700], [300, 700]];
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
            server_files: ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'],
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobID;
        });
    });

    after(() => {
        // cy.logout();
        // cy.getAuthKey().then((response) => {
        //     const authKey = response.body.key;
        //     cy.request({
        //         method: 'DELETE',
        //         url: `/api/tasks/${taskID}`,
        //         headers: {
        //             Authorization: `Token ${authKey}`,
        //         },
        //     });
        // });
    });

    describe('Draw several masks', () => {
        it('Create a mask using brush, eraser', () => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');

            cy.get('.cvat-draw-mask-control ').trigger('mouseover');
            cy.get('.cvat-draw-mask-popover').should('exist').and('be.visible').within(() => {
                cy.get('button').click();
            });
            cy.get('.upper-canvas').then(([$canvas]) => {
                const [initX, initY] = coordinates[0];
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
        });
    });
});
