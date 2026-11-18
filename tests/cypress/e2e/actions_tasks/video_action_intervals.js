// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Video action intervals', () => {
    let taskId;
    let jobId;
    const workspace = '[aria-label="Video understanding"]';
    const segment = '.cvat-action-phase-segment';
    const frameInput = '.cvat-player-frame-selector input';

    function openWorkspace() {
        cy.get('.cvat-workspace-selector').click();
        cy.get('.cvat-workspace-selector-dropdown')
            .not('.ant-select-dropdown-hidden').contains('Video understanding').click();
        cy.get(workspace).should('be.visible');
    }

    function seek(frame) {
        cy.get(frameInput).clear();
        cy.get(frameInput).type(`${frame}{enter}`);
        cy.get(frameInput).blur();
        cy.get(workspace).contains('.cvat-action-phase-details .ant-typography', `Frame ${frame}`).should('be.visible');
    }

    function pressNumber(number) {
        cy.get('body').trigger('keydown', {
            eventConstructor: 'KeyboardEvent',
            key: String(number),
            code: `Numpad${number}`,
        });
    }

    before(() => {
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName: 'Video action interval editing',
            labelName: 'Move',
            labelType: 'interval',
        });
        taskSpec.labels.push({ name: 'Inspect', attributes: [], type: 'interval' });
        cy.visit('/auth/login');
        cy.login();
        cy.readFile('mounted_file_share/videos/video_with_chapters.mp4', null).then((data) => {
            cy.window().then(({ File }) => {
                dataSpec.client_files = [new File([data], 'video.mp4', { type: 'video/mp4' })];
                return cy.headlessCreateTask(taskSpec, dataSpec, extras);
            }).then(({ taskId: tid, jobIds: [jid] }) => {
                taskId = tid;
                jobId = jid;
                cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            });
        });
    });

    after(() => {
        if (taskId !== undefined) cy.headlessDeleteTask(taskId);
    });

    it('records overlapping frame ranges and preserves inclusive endpoints after reopening', () => {
        openWorkspace();
        seek(2);
        pressNumber(1);
        cy.get('[aria-label="Draft Move"]').should('be.visible');
        seek(3);
        pressNumber(2);
        cy.get('[aria-label="Draft Inspect"]').should('be.visible');
        seek(4);
        pressNumber(1);
        seek(5);
        pressNumber(2);

        cy.contains(segment, /^Move$/).should('have.attr', 'title', 'Move · 2–4');
        cy.contains(segment, /^Inspect$/).should('have.attr', 'title', 'Inspect · 3–5');
        cy.intercept('PATCH', `/api/jobs/${jobId}/annotations*`).as('intervalSave');
        cy.clickSaveAnnotationView();
        cy.wait('@intervalSave').then(({ request, response }) => {
            expect(response.statusCode).to.equal(200);
            expect(request.body.tags).to.deep.equal([]);
            const intervals = request.body.intervals.map(({ start, stop }) => [start, stop]);
            expect(intervals).to.have.deep.members([[2, 5], [3, 6]]);
        });

        cy.reload();
        cy.get('.cvat-canvas-container').should('be.visible');
        cy.get('.cvat-workspace-selector').then(($selector) => {
            if (!$selector.text().includes('Video understanding')) openWorkspace();
        });
        cy.contains(segment, /^Move$/).should('have.attr', 'title', 'Move · 2–4');
        cy.contains(segment, /^Inspect$/).should('have.attr', 'title', 'Inspect · 3–5');
    });
});
