// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';
import { audioFile } from '../../support/const_audio';

context('Audio quality requirements and version 3 reports', () => {
    let taskId;
    let annotationUrl;

    function waitForReport(requestId, attempts = 60) {
        return cy.request(`/api/requests/${requestId}`).then(({ body }) => {
            expect(body.status).not.to.eq('failed');
            if (body.status === 'finished') return body.result_id;
            expect(attempts).to.be.greaterThan(0);
            return cy.wait(500).then(() => waitForReport(requestId, attempts - 1));
        });
    }

    before(() => {
        cy.prepareUserSession();
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName: 'Audio quality requirements',
            labelName: 'speech',
            serverFiles: [audioFile],
            validationParams: { mode: 'gt' },
        });
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId: id }) => {
            taskId = id;
            cy.request(`/api/labels?task_id=${id}`).then(({ body }) => {
                const labelId = body.results[0].id;
                cy.request(`/api/jobs?task_id=${id}`).then(({ body: jobs }) => {
                    jobs.results.forEach((job) => {
                        const intervals = [{
                            label_id: labelId, start: 0, stop: 1000, attributes: [],
                        }];
                        if (job.type === 'ground_truth') {
                            intervals.push({
                                label_id: labelId, start: 2000, stop: null, attributes: [],
                            });
                        }
                        cy.window().then((window) => window.cvat.server.request(`/api/jobs/${job.id}/annotations`, {
                            method: 'PUT',
                            data: { intervals },
                        }));
                    });
                });
            });
        });
    });

    after(() => {
        if (taskId) cy.headlessDeleteTask(taskId);
    });

    it('Configures interval quality without frame allocation and follows a conflict', () => {
        cy.intercept('GET', '/api/jobs/*/data/meta*').as('frameMetadata');
        cy.visit(`/tasks/${taskId}/quality-control#settings`);
        cy.contains('.cvat-quality-requirements-configuration-table tr', 'Base interval').within(() => {
            cy.get('[aria-label="edit"]').closest('button').click();
        });
        cy.get('.cvat-quality-requirement-form').within(() => {
            cy.get('#iouThreshold').clear();
            cy.get('#iouThreshold').type('50');
            cy.get('#iouThreshold').blur();
            cy.get('#requiredScore').clear();
            cy.get('#requiredScore').type('80');
            cy.get('#requiredScore').blur();
            cy.contains('Match groups').should('not.exist');
            cy.contains('button', 'Save').click();
        });
        cy.contains('.cvat-quality-requirements-configuration-table tr', 'Base interval')
            .find('.ant-switch').click();
        cy.intercept('PATCH', '/api/quality/settings/*').as('saveQualitySettings');
        cy.get('.cvat-quality-settings-save-btn').contains('button', 'Save').click();
        cy.wait('@saveQualitySettings').its('response.statusCode').should('eq', 200);
        cy.contains('.ant-tabs-tab', 'Management').click();
        cy.contains('Quality is compared where the job and Ground Truth time ranges overlap.').should('be.visible');
        cy.get('.cvat-frame-allocation-table').should('not.exist');
        cy.get('@frameMetadata.all').should('have.length', 0);

        cy.window().then((window) => window.cvat.server.request('/api/quality/reports', {
            method: 'POST',
            data: { task_id: taskId },
        }))
            .then(({ data }) => waitForReport(data.rq_id))
            .then((reportId) => cy.request(`/api/quality/reports/${reportId}/data`))
            .then(({ body }) => {
                const report = typeof body === 'string' ? JSON.parse(body) : body;
                expect(report.version).to.eq(3);
                expect(report.comparison_summary.has_comparison_scope).to.eq(true);
                const group = report.groups['Base interval'];
                expect(group.frame_results).to.eq(null);
                expect(group.comparison_summary.score).to.eq(0.5);
                expect(group.conflicts).to.have.length(1);
                expect(group.conflicts[0].frame_id).to.eq(null);
                annotationUrl = group.conflicts[0].annotation_ids[0].url;
                expect(annotationUrl).to.include('?type=interval&serverID=');
                expect(annotationUrl).not.to.include('frame=');
                const url = new URL(annotationUrl);
                cy.visit(`${url.pathname}${url.search}`);
            });
        cy.assertWaveformReady();
        cy.get('.cvat-audio-region-item').should('have.length', 1);
    });
});
