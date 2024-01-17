// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Correct behaviour of fit when navigating between frames with different resolution', { scrollBehavior: false }, () => {
    const taskName = 'Fit different resolutions';
    const serverFiles = ['test_different_resolutions/image_1.jpg', 'test_different_resolutions/image_2.jpg'];

    let taskID = null;
    let jobID = null;

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.url().should('contain', '/tasks');
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
        cy.intercept('GET', `/tasks/${taskID}/jobs/${jobID}`).as('visitAnnotationView');
        cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
        cy.wait('@visitAnnotationView');
        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
    });

    function checkBackgroundIsVisible(resetZoom) {
        let rectBefore = null;
        cy.get('#cvat_canvas_background').then(([el]) => {
            rectBefore = el.getBoundingClientRect();
        });
        cy.openSettings();
        if (resetZoom) {
            cy.get('.cvat-player-settings-reset-zoom-checkbox').within(() => {
                cy.get('[type="checkbox"]').check();
                cy.get('[type="checkbox"]').should('be.checked');
            });
        } else {
            cy.get('.cvat-player-settings-reset-zoom-checkbox').within(() => {
                cy.get('[type="checkbox"]').uncheck();
                cy.get('[type="checkbox"]').should('not.be.checked');
            });
        }
        cy.closeSettings();
        cy.goCheckFrameNumber(1);
        cy.get('#cvat_canvas_background').then(([el]) => {
            const rectAfter = el.getBoundingClientRect();
            expect(rectBefore.width).to.be.approximately(rectAfter.width, 1);
            expect(rectBefore.height).to.be.approximately(rectAfter.height, 1);
            expect(rectBefore.top).to.be.approximately(rectAfter.top, 5);
            expect(rectBefore.left).to.be.approximately(rectAfter.left, 5);
        });
    }

    describe('Check fitting when moving between frames. Image should be visible regardless of "reset zoom" option', () => {
        it('Fitting when reset zoom is checked', () => {
            checkBackgroundIsVisible(true);
        });

        it('Fitting when reset zoom is unchecked', () => {
            checkBackgroundIsVisible(false);
        });
    });
});
