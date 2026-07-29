// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { fullMatch } from '../../support/utils';

context('Remove Annotations dialog. Filter by source.', () => {
    let taskId = null;
    let jobId = null;
    let labelId = null;

    const frames = [0, 1];

    const taskPayload = {
        name: 'Test remove annotations by source',
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

    function seedAnnotations() {
        const shapes = frames.map((frame) => [{
            type: 'rectangle',
            occluded: false,
            outside: false,
            z_order: 0,
            points: [100, 100, 200, 200],
            rotation: 0,
            attributes: [],
            elements: [],
            frame,
            label_id: labelId,
            group: 0,
            source: 'manual',
        }, {
            type: 'rectangle',
            occluded: false,
            outside: false,
            z_order: 0,
            points: [300, 300, 400, 400],
            rotation: 0,
            attributes: [],
            elements: [],
            frame,
            label_id: labelId,
            group: 0,
            source: 'auto',
        }]).flat();

        const tags = frames.map((frame) => [{
            frame,
            label_id: labelId,
            source: 'manual',
            group: 0,
            attributes: [],
        }, {
            frame,
            label_id: labelId,
            source: 'auto',
            group: 0,
            attributes: [],
        }]).flat();

        return cy.window().then((window) => window.cvat.server.request(`/api/jobs/${jobId}/annotations`, {
            method: 'PUT',
            data: { shapes, tracks: [], tags },
        }));
    }

    function openRemoveAnnotationsDialog() {
        cy.contains('.cvat-annotation-header-button', 'Menu').click();
        cy.get('.cvat-annotation-menu').within(() => {
            cy.contains('Remove annotations').click();
        });
        cy.get('.cvat-modal-confirm-remove-annotation').should('be.visible');
    }

    function toggleSource(sourceLabel) {
        cy.get('.cvat-modal-confirm-remove-annotation-sources')
            .contains('.ant-checkbox-wrapper', fullMatch(sourceLabel))
            .find('.ant-checkbox-input')
            .click();
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
            }).then(() => seedAnnotations());
        });
    });

    beforeEach(() => {
        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
    });

    describe('Testing "Remove annotations" dialog source filter', () => {
        it('Remove button is disabled when no source is selected', () => {
            openRemoveAnnotationsDialog();
            ['Auto', 'Semi-auto', 'Manual', 'File', 'Consensus'].forEach((sourceLabel) => toggleSource(sourceLabel));
            cy.get('.cvat-modal-confirm-remove-annotation').within(() => {
                cy.contains('button', 'Remove').should('be.disabled');
                cy.contains('button', 'Cancel').click();
            });
        });

        it('Removing only the "Auto" source keeps manual annotations', () => {
            frames.forEach((frame) => {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat_canvas_shape').should('have.length', 2);
                cy.get('.cvat-frame-tag').should('have.length', 2);
            });

            openRemoveAnnotationsDialog();
            // Unselect every source except "Auto": only auto-sourced annotations get removed
            ['Semi-auto', 'Manual', 'File', 'Consensus'].forEach((sourceLabel) => toggleSource(sourceLabel));
            cy.get('.cvat-modal-confirm-remove-annotation').within(() => {
                cy.contains('button', 'Remove').click();
            });
            cy.saveJob('PATCH', 200, 'saveJob');

            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');

            frames.forEach((frame) => {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat_canvas_shape').should('have.length', 1);
                cy.get('.cvat-frame-tag').should('have.length', 1);
            });
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
