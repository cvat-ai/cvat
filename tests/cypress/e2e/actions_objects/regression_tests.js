// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Regression tests', () => {
    let taskID = null;
    let jobID = null;

    const taskPayload = {
        name: 'Test annotations actions',
        labels: [{
            name: 'label 1',
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
        frame: 99,
        objectType: 'SHAPE',
        shapeType: 'RECTANGLE',
        points: [250, 64, 491, 228],
        occluded: false,
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();

        cy.headlessCreateTask(taskPayload, dataPayload).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;

            cy.headlessCreateObject([rectanglePayload], jobID);
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
        });
    });

    describe('Regression tests', () => {
        it('UI does not crash if to activate an object while frame fetching', () => {
            cy.reload();
            cy.intercept('GET', '/api/jobs/**/data?**', (req) => {
                req.continue((res) => {
                    res.setDelay(1000);
                });
            }).as('delayedRequest');
            cy.get('.cvat-player-last-button').click();

            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').should('not.have.class', 'cvat_canvas_shape_activated');

            cy.wait('@delayedRequest');
            cy.get('#cvat_canvas_shape_1').trigger('mousemove');
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
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
});
