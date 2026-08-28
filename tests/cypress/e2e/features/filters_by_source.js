// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Filters functionality. Filter by source.', () => {
    let taskId = null;
    let jobId = null;
    let labelId = null;

    const taskPayload = {
        name: 'Test filters by source',
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
        server_files: ['archive.zip'],
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };

    const sourceCoordinates = {
        manual: [100, 100],
        auto: [300, 300],
        'semi-auto': [500, 500],
    };

    function seedAnnotations() {
        const shapes = Object.entries(sourceCoordinates).map(([source, [x, y]]) => ({
            type: 'rectangle',
            occluded: false,
            outside: false,
            z_order: 0,
            points: [x, y, x + 100, y + 100],
            rotation: 0,
            attributes: [],
            elements: [],
            frame: 0,
            label_id: labelId,
            group: 0,
            source,
        }));

        return cy.window().then((window) => window.cvat.server.request(`/api/jobs/${jobId}/annotations`, {
            method: 'PUT',
            data: { shapes, tracks: [], tags: [] },
        }));
    }

    function assertVisibleObjects(amount, source = null) {
        cy.get('.cvat_canvas_shape').should('have.length', amount);
        cy.get('.cvat-objects-sidebar-state-item').should('have.length', amount);

        if (source) {
            cy.get('.cvat_canvas_shape').trigger('mousemove');
            cy.get('#cvat_canvas_text_content').should('contain.text', `(${source})`);
        }
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        cy.headlessCreateTask(taskPayload, dataPayload).then((response) => {
            taskId = response.taskId;
            [jobId] = response.jobIds;

            cy.intercept(`/api/labels?**job_id=${jobId}**`).as('getJobLabels');
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            cy.wait('@getJobLabels').then((interception) => {
                [{ id: labelId }] = interception.response.body.results;
            }).then(() => seedAnnotations()).then(() => {
                cy.reload();
                cy.get('.cvat-spinner').should('not.exist');
                cy.get('.cvat-canvas-container').should('exist').and('be.visible');
                assertVisibleObjects(3);
            });
        });
    });

    describe('Testing filter by source', () => {
        afterEach(() => {
            cy.clearFilters();
            assertVisibleObjects(3);
        });

        it('Filter: source == "auto". Only the auto-sourced shape exists.', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0, ruleIndex: 0, field: 'Source', operator: '==', value: 'auto', submit: true,
            });
            assertVisibleObjects(1, 'auto');
        });

        it('Filter: source == "manual". Only the manual-sourced shape exists.', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0, ruleIndex: 0, field: 'Source', operator: '==', value: 'manual', submit: true,
            });
            assertVisibleObjects(1, 'manual');
        });

        it('Filter: source == "semi-auto". Only the semi-auto-sourced shape exists.', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0, ruleIndex: 0, field: 'Source', operator: '==', value: 'semi-auto', submit: true,
            });
            assertVisibleObjects(1, 'semi-auto');
        });
    });

    after(() => {
        cy.logout();
        cy.task('getAuthHeaders').then((authHeaders) => {
            if (taskId) {
                cy.request({
                    method: 'DELETE',
                    url: `/api/tasks/${taskId}`,
                    headers: authHeaders,
                });
            }
        });
    });
});
