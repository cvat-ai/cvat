// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Manipulations with masks', { scrollBehavior: false }, () => {
    const taskName = 'Single object annotation mode';
    const labelName = 'poly_label';
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const frameCount = serverFiles.length;

    let taskID = null;
    let jobID = null;

    const polygonPoints = [
        { x: 300, y: 100 },
        { x: 400, y: 400 },
        { x: 400, y: 250 },
        { x: 450, y: 350 },
    ];

    function createPolygon(points) {
        points.forEach((element) => {
            cy.get('.cvat-canvas-container').click(element.x, element.y);
        });
    }

    function checkFrameNum(frameNum) {
        cy.get('.cvat-player-frame-selector').within(() => {
            cy.get('input[role="spinbutton"]').should('have.value', frameNum);
        });
    }

    function submitJob() {
        cy.get('.cvat-single-shape-annotation-submit-job-modal').should('exist');
        cy.get('.cvat-single-shape-annotation-submit-job-modal').within(() => { cy.contains('Submit').click(); });

        cy.intercept('PATCH', '/api/jobs/**').as('submitJob');
        cy.wait('@submitJob').its('response.statusCode').should('equal', 200);

        cy.get('.cvat-single-shape-annotation-submit-success-modal').should('exist');
        cy.get('.cvat-single-shape-annotation-submit-success-modal').within(() => { cy.contains('OK').click(); });
    }

    function checkSingleShapeModeOpened() {
        cy.get('.cvat-workspace-selector').should('have.text', 'Single shape');
        cy.get('.cvat-canvas-controls-sidebar').should('not.exist');
        cy.get('.cvat-player-frame-selector input').should('be.disabled');

        cy.get('.cvat-single-shape-annotation-sidebar-hint').should('exist');
        cy.get('.cvat-single-shape-annotation-sidebar-ux-hints').should('exist');
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'polygon' }],
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

    describe('Tests basic features of single shape annotation mode', () => {
        beforeEach(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`, {
                qs: {
                    defaultWorkspace: 'single_shape',
                    defaultLabel: labelName,
                    defaultPointsCount: 4,
                },
            });
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });

        afterEach(() => {
            cy.removeAnnotations();
            cy.saveJob();
        });

        it('Check basic single shape annotation pipeline', () => {
            checkSingleShapeModeOpened();

            for (let frame = 0; frame < frameCount; frame++) {
                createPolygon(polygonPoints);
                checkFrameNum(frame);
            }

            submitJob();
        });

        it('Check single shape annotation mode controls', () => {
            checkSingleShapeModeOpened();

            // Skip
            cy.get('.cvat-single-shape-annotation-sidebar-skip-wrapper').within(() => {
                cy.contains('Skip').click();
            });
            checkFrameNum(1);

            // Auto next frame - disabled
            cy.get('.cvat-single-shape-annotation-sidebar-auto-next-frame-checkbox').within(() => {
                cy.get('[type="checkbox"]').uncheck();
            });
            createPolygon(polygonPoints);
            checkFrameNum(1);

            // Auto save when finish
            cy.get('.cvat-player-next-button-empty').click();
            cy.get('.cvat-single-shape-annotation-sidebar-auto-save-checkbox').within(() => {
                cy.get('[type="checkbox"]').uncheck();
            });
            createPolygon(polygonPoints);
            cy.get('.cvat-single-shape-annotation-submit-job-modal').should('not.exist');

            // Navigate only on empty frames
            cy.get('.cvat-player-previous-button-empty').click();
            checkFrameNum(0);
            cy.get('.cvat-player-next-button-empty').click();
            checkFrameNum(0);
            cy.get('.cvat-single-shape-annotation-sidebar-navigate-empty-checkbox').within(() => {
                cy.get('[type="checkbox"]').uncheck();
            });
            cy.get('.cvat-player-next-button').click();
            checkFrameNum(1);
            cy.get('.cvat-player-next-button').click();
            checkFrameNum(2);

            cy.saveJob();
        });
    });
});
