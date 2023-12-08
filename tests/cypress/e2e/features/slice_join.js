// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Slice and join', { scrollBehavior: false }, () => {
    const taskName = 'Slice and join actions';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const basicMask = [{
        method: 'brush',
        coordinates: [[300, 300], [700, 300], [700, 700], [300, 700]],
    }];
    const doubleMask = [{
        method: 'brush',
        coordinates: [[200, 200], [300, 200], [300, 300], [200, 300]],
    },
    {
        method: 'brush',
        coordinates: [[200, 350], [300, 350], [300, 450], [200, 450]],
    },
    ];
    let taskID = null;
    let jobID = null;

    before(() => {
        // cy.visit('auth/login');
        // cy.login();
        cy.visit('/tasks');
        cy.get('.cvat-tasks-page-top-bar').should('be.visible');
        cy.headlessCreateTask({
            labels: [
                { name: 'mask label', attributes: [], type: 'mask' },
                { name: 'polygon label', attributes: [], type: 'polygon' },
            ],
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

    // after(() => {
    //     cy.logout();
    //     cy.getAuthKey().then((response) => {
    //         const authKey = response.body.key;
    //         cy.request({
    //             method: 'DELETE',
    //             url: `/api/tasks/${taskID}`,
    //             headers: {
    //                 Authorization: `Token ${authKey}`,
    //             },
    //         });
    //     });
    // });

    beforeEach(() => {
        cy.removeAnnotations();
        cy.goCheckFrameNumber(0);
    });

    function checkSliceSuccess() {
        cy.get('#cvat_canvas_shape_1').should('not.exist');
        cy.get('#cvat_canvas_shape_2').should('exist').and('be.visible');
        cy.get('#cvat_canvas_shape_3').should('exist').and('be.visible');
    }

    describe('Slice join actions', () => {
        it('Draw basic mask. Slice by ', () => {
            cy.startMaskDrawing();
            cy.drawMask(basicMask);
            cy.finishMaskDrawing();

            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.slice('#cvat_canvas_shape_1', [[250, 200], [720, 720]]);

            checkSliceSuccess();
        });

        it('Draw double mask. Slice by ', () => {
            cy.startMaskDrawing();
            cy.drawMask(doubleMask);
            cy.finishMaskDrawing();

            cy.get('#cvat_canvas_shape_1').should('exist').and('be.visible');
            cy.slice('#cvat_canvas_shape_1', [[150, 230], [300, 230]]);

            checkSliceSuccess();
        });
    });

    // cy.get('#cvat-objects-sidebar-state-item-1').within(() => {
    //     cy.contains('MASK SHAPE').click();
    // });
    // cy.get('body').trigger('keydown', { code: 'KeyJ', keyCode:74, altKey:true });
    // cy.get('body').trigger('keyup', { code: 'KeyJ',  keyCode:74, altKey:true });
});
