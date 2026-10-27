// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

function dragMarker(id, view, dx, dy, cancel = false, label = false) {
    const selector = label ? `#cvat-hidden-issue-label-${id}-${view}` :
        `.cvat-canvas3d-issue-region[data-issue-id="${id}"][data-view="${view}"]`;
    return cy.get(selector).should('be.visible').then(($marker) => {
        const rect = $marker[0].getBoundingClientRect();
        const from = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        const options = {
            eventConstructor: 'PointerEvent', pointerId: 1, button: 0, isPrimary: true,
        };
        cy.wrap($marker).trigger('pointerdown', { ...options, ...from });
        cy.get('body').trigger('pointermove', {
            ...options, clientX: from.clientX + dx, clientY: from.clientY + dy,
        });
        if (cancel) cy.get('body').type('{esc}');
        cy.get('body').trigger('pointerup', {
            ...options, clientX: from.clientX + dx, clientY: from.clientY + dy,
        });
    });
}

function perspectiveSnapshot(canvas, serverId) {
    return new Cypress.Promise((resolve) => {
        const { scene } = canvas;
        const previous = scene.onAfterRender;
        scene.onAfterRender = (renderer, renderedScene, camera) => {
            scene.onAfterRender = previous;
            previous.call(scene, renderer, renderedScene, camera);
            const object = canvas.getDrawnObjects().find((item) => item.state.serverID === serverId);
            const mesh = object.cuboid.perspective;
            const projected = mesh.getWorldPosition(mesh.position.clone()).project(camera);
            const rect = canvas.getBoundingClientRect();
            resolve({
                rotation: camera.quaternion.toArray(),
                point: {
                    clientX: rect.left + ((projected.x + 1) / 2) * rect.width,
                    clientY: rect.top + ((1 - projected.y) / 2) * rect.height,
                },
            });
        };
    });
}

function rotateScene(canvas, origin, returnToOrigin = false) {
    const pointer = {
        eventConstructor: 'PointerEvent', pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true,
    };
    const destination = { clientX: origin.clientX + 60, clientY: origin.clientY + 30 };
    cy.wrap(canvas).trigger('pointerdown', { ...pointer, ...origin, buttons: 1 });
    cy.wrap(canvas).trigger('mousedown', { ...origin, button: 0, buttons: 1 });
    [destination, ...(returnToOrigin ? [origin] : [])].forEach((position) => {
        cy.get('body').trigger('pointermove', { ...pointer, ...position, buttons: 1 });
        cy.get('body').trigger('mousemove', { ...position, buttons: 1 });
    });
    const end = returnToOrigin ? origin : destination;
    cy.get('body').trigger('pointerup', { ...pointer, ...end, buttons: 0 });
    cy.get('body').trigger('mouseup', { ...end, button: 0, buttons: 0 });
    cy.wrap(canvas).trigger('click', { ...end, button: 0, detail: 1 });
}

context('3D spatial review', { browser: '!firefox' }, () => {
    let taskId;
    let jobId;
    let firstIssueId;

    function createIssue(message) {
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();
        cy.get('.cvat-canvas3d-perspective canvas').click('center');
        cy.get('.cvat-create-issue-dialog').should('be.visible').within(() => {
            cy.get('#issue_description').type(message);
            cy.intercept('POST', '/api/issues**').as('create3dIssue');
            cy.contains('button', 'Submit').click();
        });
        return cy.wait('@create3dIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.position).to.have.length(3);
            expect(response.body.position.every(Number.isFinite)).to.equal(true);
            return response.body.id;
        });
    }

    before(() => {
        cy.prepareUserSession();
        const { taskSpec, dataSpec } = defaultTaskSpec({
            taskName: '3D spatial review regression',
            labelName: 'car',
            serverFiles: ['test_canvas3d.zip'],
        });
        cy.headlessCreateTask(taskSpec, dataSpec).then((result) => {
            taskId = result.taskId;
            [jobId] = result.jobIds;
            cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        });
    });

    after(() => {
        if (taskId) cy.headlessDeleteTask(taskId);
    });

    it('supports the 3D issue lifecycle, persistence, navigation and visibility', () => {
        cy.get('.cvat-workspace-selector').should('have.text', 'Review');
        cy.get('.cvat-draw-cuboid-control').should('not.exist');

        // Empty background cannot establish a 3D location.
        cy.get('body').type('n');
        cy.get('.cvat-canvas3d-perspective canvas').click(50, 50);
        cy.get('.cvat-create-issue-dialog').should('not.exist');
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();

        createIssue('Check this point cloud boundary').then((id) => {
            firstIssueId = id;
            cy.get('.cvat-canvas3d-issues .cvat-hidden-issue-label').should('have.length', 4);
            cy.get(`#cvat-hidden-issue-label-${id}-perspective`)
                .should('contain.text', 'Check this point cloud boundary').click();
            cy.contains('[role="tab"]', 'Objects').should('have.attr', 'aria-selected', 'true');
            cy.get('.ant-modal').should('not.exist');
            cy.get('.cvat-objects-sidebar').find('.cvat-issue-dialog').should('not.exist');
            cy.get('.cvat-issue-dialog').within(() => {
                cy.get('input').type('Checked in the side view');
                cy.intercept('POST', '/api/comments**').as('comment3dIssue');
                cy.contains('button', 'Comment').click();
                cy.wait('@comment3dIssue').its('response.statusCode').should('equal', 201);
                cy.contains('Checked in the side view').should('be.visible');
                cy.intercept('PATCH', `/api/issues/${id}`).as('resolve3dIssue');
                cy.contains('button', 'Resolve').click();
                cy.wait('@resolve3dIssue');
            });
            cy.get('.cvat-issue-dialog').should('not.exist');
        });

        cy.reload();
        cy.contains('[role="tab"]', 'Issues').click();
        cy.get('.cvat-hidden-issue-resolved-indicator').should('have.length', 4);
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${firstIssueId}`).trigger('mouseover'));
        cy.get('.cvat-canvas3d-issue-highlighted').should('have.length', 4);
        cy.get('.cvat-issue-dialog').should('not.exist');
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${firstIssueId}`).trigger('mouseout'));
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${firstIssueId}`).click());
        cy.get('.cvat-issue-dialog').within(() => {
            cy.contains('Checked in the side view').should('be.visible');
            cy.contains('button', 'Reopen').click();
            cy.contains('button', 'Resolve').should('be.visible');
        });
        cy.goCheckFrameNumber(2);
        createIssue('Check this later frame');
        cy.contains('[role="tab"]', 'Issues').click();
        cy.get('.cvat-issues-sidebar-previous-frame').click();
        cy.checkFrameNum(0);
        cy.get('.cvat-issues-sidebar-next-frame').click();
        cy.checkFrameNum(2);
        cy.get('.cvat-issues-sidebar-shown-issues').click();
        cy.get('.cvat-canvas3d-issues .cvat-hidden-issue-label').should('not.exist');
        cy.get('.cvat-objects-sidebar-issue-item').should('have.length', 1);
        cy.get('.cvat-issues-sidebar-hidden-issues').click();
        cy.get('.cvat-canvas3d-issues .cvat-hidden-issue-label').should('have.length', 4);
        cy.get('.cvat-objects-sidebar-issue-item').click();
        cy.get('.cvat-issue-dialog').contains('button', 'Resolve').click();
        cy.get('.cvat-issues-sidebar-hidden-resolved-status').click();
        cy.get('.cvat-canvas3d-issues .cvat-hidden-issue-label').should('not.exist');
        cy.get('.cvat-objects-sidebar-issue-item').should('have.length', 1);
        cy.get('.cvat-issues-sidebar-previous-frame').click();
        cy.checkFrameNum(0);
        cy.get('.cvat-issues-sidebar-next-frame').should('have.css', 'pointer-events', 'none');
        cy.changeWorkspace('Standard 3D');
        cy.get('.cvat-draw-cuboid-control').should('exist');
        cy.get('.cvat-objects-sidebar-issue-item').should('have.length', 1);
    });

    it('opens quick issues at a cuboid center using XYZ coordinates', () => {
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => {
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    shapes: [{
                        type: 'cuboid',
                        frame: 0,
                        label_id: body.results[0].id,
                        points: [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                        attributes: [],
                        occluded: false,
                        z_order: 0,
                        rotation: 0,
                    }],
                    tracks: [],
                    tags: [],
                },
            });
        }));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
        cy.get('#cvat-objects-sidebar-state-item-1').should('have.class', 'cvat-objects-sidebar-state-active-item');
        cy.get('.cvat-canvas3d-perspective canvas').trigger('contextmenu', {
            button: 2, clientX: 300, clientY: 200,
        });
        cy.intercept('POST', '/api/issues**').as('cuboidIssue');
        cy.contains('.cvat-context-menu-item', 'Quick issue: incorrect position').click();
        cy.wait('@cuboidIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.position).to.deep.equal([0, 0, 1]);
            expect(response.body.object_type).to.equal('shape');
            expect(response.body.object_id).to.be.a('number');
            cy.get(`#cvat-hidden-issue-label-${response.body.id}-perspective`).click();
        });
        cy.get('.cvat-issue-dialog').should('be.visible');
        cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
        cy.get('.cvat-canvas3d-perspective canvas').trigger('contextmenu', {
            button: 2, clientX: 300, clientY: 200,
        });
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.get('.cvat-create-issue-dialog').should('be.visible');
        cy.get('.cvat-issue-dialog').should('not.exist');
        cy.get('.cvat-create-issue-dialog').within(() => {
            cy.get('#issue_description').type('Check the cuboid extents');
            cy.contains('button', 'Submit').click();
        });
        cy.wait('@cuboidIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.position).to.deep.equal([0, 0, 1]);
            cy.removeIssue(`#cvat-hidden-issue-label-${response.body.id}-perspective`);
            cy.get(`#cvat-hidden-issue-label-${response.body.id}-perspective`).should('not.exist');
        });
    });

    it('drags draft and saved markers in orthographic planes and restores canceled or failed moves', () => {
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review&frame=1`);
        cy.checkFrameNum(1);
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();
        cy.get('.cvat-canvas3d-perspective canvas').click('center');
        cy.get('#issue_description').type('Move this review point');
        let draftRect;
        const draftSelector = '.cvat-canvas3d-issue-region[data-issue-id="0"][data-view="top"]';
        cy.get(draftSelector).then(($marker) => { draftRect = $marker[0].getBoundingClientRect(); });
        dragMarker(0, 'top', 16, -10);
        cy.get(draftSelector).should(($marker) => {
            const rect = $marker[0].getBoundingClientRect();
            expect(rect.left - draftRect.left).to.be.closeTo(16, 1);
            expect(rect.top - draftRect.top).to.be.closeTo(-10, 1);
        });
        cy.get('#issue_description').should('have.value', 'Move this review point');
        cy.intercept('POST', '/api/issues**').as('createDraggableIssue');
        cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
        cy.wait('@createDraggableIssue').then(({ response }) => {
            const { id } = response.body;
            let { position } = response.body;
            [['top', 2], ['side', 1], ['front', 0]].forEach(([view, depthAxis]) => {
                cy.then(() => {
                    const before = [...position];
                    cy.intercept('PATCH', `/api/issues/${id}`).as(`moveReviewIssue-${view}`);
                    dragMarker(id, view, 12, -8, false, view === 'side');
                    cy.wait(`@moveReviewIssue-${view}`).then(({ response: moved }) => {
                        expect(moved.statusCode).to.equal(200);
                        expect(moved.body.position[depthAxis]).to.be.closeTo(before[depthAxis], 0.000001);
                        expect(moved.body.position).not.to.deep.equal(before);
                        expect(moved.body.resolved).to.equal(false);
                        position = moved.body.position;
                    });
                    cy.get('.cvat-issue-dialog').should('not.exist');
                });
            });
            cy.reload();
            cy.goCheckFrameNumber(1);
            cy.get(`#cvat-hidden-issue-label-${id}-perspective`).should('contain.text', 'Move this review point');
            cy.request(`/api/issues/${id}`).then(({ body }) => expect(body.position).to.deep.equal(position));
            dragMarker(id, 'top', 24, 12, true);
            cy.request(`/api/issues/${id}`).then(({ body }) => expect(body.position).to.deep.equal(position));
            cy.intercept({ method: 'PATCH', url: `/api/issues/${id}`, times: 1 }, {
                statusCode: 403, body: { detail: 'Test rejected move' },
            }).as('rejectedMove');
            const selector = `.cvat-canvas3d-issue-region[data-issue-id="${id}"][data-view="front"]`;
            let beforeRect;
            cy.get(selector).then(($marker) => { beforeRect = $marker[0].getBoundingClientRect(); });
            dragMarker(id, 'front', 24, 12);
            cy.wait('@rejectedMove');
            cy.contains('Could not move the issue').should('be.visible');
            cy.get(selector).should(($marker) => {
                const rect = $marker[0].getBoundingClientRect();
                expect(rect.left).to.be.closeTo(beforeRect.left, 1);
                expect(rect.top).to.be.closeTo(beforeRect.top, 1);
            });
            cy.request(`/api/issues/${id}`).then(({ body }) => expect(body.position).to.deep.equal(position));
            cy.goCheckFrameNumber(0);
            cy.checkFrameNum(0);
        });
    });

    it('links a track across a frame range while keeping its marker independently draggable', () => {
        let trackId;
        let issueId;
        const points = [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => {
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    shapes: [],
                    tags: [],
                    tracks: [{
                        frame: 0,
                        label_id: body.results[0].id,
                        attributes: [],
                        shapes: [0, 2].map((frame) => ({
                            frame,
                            type: 'cuboid',
                            points: [frame, ...points.slice(1)],
                            attributes: [],
                            occluded: false,
                            outside: false,
                            z_order: 0,
                            rotation: 0,
                        })),
                    }],
                },
            }).then(({ body: annotations }) => { trackId = annotations.tracks[0].id; });
        }));
        cy.intercept('GET', `/api/jobs/${jobId}/data*type=context_image*`).as('reviewFrameContext');
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review&frame=1`);
        cy.wait('@reviewFrameContext');
        cy.get('.cvat-issue-control:not(.cvat-disabled-canvas-control)').should('exist');
        cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID TRACK').trigger('mouseover');
        cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID TRACK')
            .should('have.class', 'cvat-objects-sidebar-state-active-item');
        cy.get('.cvat-canvas3d-perspective canvas').trigger('contextmenu', {
            button: 2, clientX: 300, clientY: 200,
        });
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.get('.cvat-create-issue-object').should('contain.text', 'Track #');
        cy.get('#issue_end_frame').clear();
        cy.get('#issue_end_frame').type('2');
        cy.get('#issue_description').type('Check this track across frames');
        cy.intercept('POST', '/api/issues**').as('rangeIssue');
        cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
        cy.wait('@rangeIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.object_type).to.equal('track');
            expect(response.body.object_id).to.equal(trackId);
            expect(response.body.frame).to.equal(1);
            expect(response.body.end_frame).to.equal(2);
            issueId = response.body.id;
        });
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).should('contain.text', 'Frames 1–2'));
        cy.goCheckFrameNumber(0);
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).should('not.exist'));
        cy.goCheckFrameNumber(2);
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-select-object').should('contain.text', 'Track #').click();
        cy.get('.cvat-objects-sidebar-state-active-item').should('contain.text', 'CUBOID TRACK');
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.then(() => {
            cy.intercept('PATCH', `/api/issues/${issueId}`).as('moveRangeIssue');
            dragMarker(issueId, 'top', 10, -6);
            cy.wait('@moveRangeIssue').then(({ response }) => {
                expect(response.body.object_id).to.equal(trackId);
                expect(response.body.end_frame).to.equal(2);
            });
        });
        cy.reload();
        cy.goCheckFrameNumber(2);
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-context').should('contain.text', 'Frames 1–2');
        cy.get('.cvat-issue-dialog input').type('The position needs correction');
        cy.get('.cvat-issue-dialog').contains('button', 'Comment').click();
        cy.get('.cvat-issue-dialog').contains('The position needs correction').should('be.visible');
        cy.get('.cvat-issues-sidebar-previous-frame').click();
        cy.checkFrameNum(1);
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-dialog').contains('The position needs correction').should('be.visible');
        cy.get('.cvat-issue-dialog').contains('button', 'Resolve').click();

        // Removing an annotation leaves the discussion and its spatial marker intact.
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE',
            url: `/api/jobs/${jobId}/annotations`,
            headers: { 'X-CSRFToken': cookie.value },
        }));
        cy.reload();
        cy.goCheckFrameNumber(1);
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-dialog').should('contain.text', 'Linked track unavailable on this frame');
        cy.get('.cvat-issue-dialog').contains('button', 'Reopen').click();
        cy.then(() => dragMarker(issueId, 'front', 8, 4));
        cy.then(() => cy.request(`/api/issues/${issueId}`).then(({ body }) => {
            expect(body.object_id).to.equal(trackId);
            expect(body.end_frame).to.equal(2);
            expect(body.resolved).to.equal(false);
        }));
    });

    it('saves a new cuboid before linking an issue to it', () => {
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE',
            url: `/api/jobs/${jobId}/annotations`,
            headers: { 'X-CSRFToken': cookie.value },
        }));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.changeWorkspace('Standard 3D');
        cy.create3DCuboid({
            x: 400, y: 250, labelName: 'car', objectType: 'Shape',
        });
        cy.changeWorkspace('Review');
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();
        cy.get('.cvat-canvas3d-perspective canvas').click('center');
        cy.get('.cvat-create-issue-object').click();
        cy.contains('.ant-select-item-option', 'Shape #').click();
        cy.get('#issue_description').type('Review this newly created cuboid');
        cy.intercept({ method: '+(PATCH|PUT)', url: `/api/jobs/${jobId}/annotations**` }).as('saveLinkedCuboid');
        cy.intercept('POST', '/api/issues**').as('newCuboidIssue');
        cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
        cy.wait('@saveLinkedCuboid').its('response.statusCode').should('equal', 200);
        cy.wait('@newCuboidIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.object_type).to.equal('shape');
            expect(response.body.object_id).to.be.a('number');
            cy.request(`/api/jobs/${jobId}/annotations`).then(({ body }) => {
                expect(body.shapes.some((shape) => shape.id === response.body.object_id)).to.equal(true);
            });
        });
        cy.reload();
        cy.contains('[role="tab"]', 'Issues').click();
        cy.contains('.cvat-objects-sidebar-issue-item', 'Review this newly created cuboid')
            .should('contain.text', 'car · Shape');
    });

    it('limits issue overlays to expanded panes and preserves drafts when switching views', () => {
        let issueId;
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => {
            const headers = { 'X-CSRFToken': cookie.value };
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers,
                body: {
                    tags: [],
                    tracks: [],
                    shapes: [{
                        type: 'cuboid',
                        frame: 0,
                        label_id: body.results[0].id,
                        points: [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                        attributes: [],
                        occluded: false,
                        z_order: 0,
                        rotation: 0,
                    }],
                },
            });
            cy.request({
                method: 'POST',
                url: '/api/issues',
                headers,
                body: {
                    job: jobId, frame: 0, position: [0, 0, 1], message: 'Review the expanded view',
                },
            }).then(({ body: issue }) => { issueId = issue.id; });
        }));
        cy.intercept('GET', `/api/jobs/${jobId}/data*type=context_image*`).as('expandedContext');
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.wait('@expandedContext');
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-dialog input').type('Keep this comment');
        cy.then(() => {
            const marker = `.cvat-canvas3d-issue-region[data-issue-id="${issueId}"]`;
            cy.get(marker).should('have.length', 4);
            ['perspective', 'top', 'side', 'front'].forEach((view) => {
                const selector = view === 'perspective' ? view : `${view}view`;
                cy.get(`.cvat-canvas3d-${selector}`).closest('.cvat-canvas-grid-item')
                    .find('.cvat-grid-item-fullscreen-handler').click();
                cy.get(marker).should('have.length', 1).and('have.attr', 'data-view', view);
                cy.get('.cvat-issue-dialog').should('be.visible');
                cy.get('.cvat-issue-dialog input').should('have.value', 'Keep this comment');
                cy.get('.cvat-canvas-grid-fullscreen-item .cvat-grid-item-fullscreen-handler').click();
                cy.get(marker).should('have.length', 4);
            });
            cy.get('.cvat-context-image-wrapper').closest('.cvat-canvas-grid-item')
                .find('.cvat-grid-item-fullscreen-handler').click();
            cy.get('.cvat-canvas3d-issue-region').should('not.exist');
            cy.get('.cvat-canvas3d-issues .cvat-hidden-issue-label').should('not.exist');
            cy.get('.cvat-issue-dialog').should('not.be.visible');
            cy.get('.cvat-canvas-grid-fullscreen-item .cvat-grid-item-fullscreen-handler').click();
            cy.get('.cvat-issue-dialog input').should('have.value', 'Keep this comment');
        });
        cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
        cy.contains('[role="tab"]', 'Objects').click();
        cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID SHAPE').trigger('mouseover');
        cy.get('.cvat-canvas3d-perspective canvas').trigger('contextmenu', {
            button: 2, clientX: 300, clientY: 200,
        });
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.get('#issue_description').type('Keep this issue description');
        cy.get('#issue_end_frame').clear();
        cy.get('#issue_end_frame').type('2');
        cy.get('.cvat-canvas3d-topview').closest('.cvat-canvas-grid-item')
            .find('.cvat-grid-item-fullscreen-handler').click();
        cy.get('#issue_description').should('be.visible').and('have.value', 'Keep this issue description');
        cy.get('#issue_end_frame').should('have.value', '2');
        cy.get('.cvat-canvas-grid-fullscreen-item .cvat-grid-item-fullscreen-handler').click();
        cy.get('.cvat-context-image-wrapper').closest('.cvat-canvas-grid-item')
            .find('.cvat-grid-item-fullscreen-handler').click();
        cy.get('.cvat-create-issue-dialog').should('not.be.visible');
        cy.get('.cvat-canvas-grid-fullscreen-item .cvat-grid-item-fullscreen-handler').click();
        cy.get('#issue_description').should('have.value', 'Keep this issue description');
        cy.get('#issue_end_frame').should('have.value', '2');
        cy.get('.cvat-create-issue-dialog-cancel-button').click();
    });

    it('rotates the scene while placing an issue without treating a drag as a point', () => {
        let shapeId;
        let before;
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => {
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    tags: [],
                    tracks: [],
                    shapes: [{
                        type: 'cuboid',
                        frame: 0,
                        label_id: body.results[0].id,
                        points: [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                        attributes: [],
                        occluded: false,
                        z_order: 0,
                        rotation: 0,
                    }],
                },
            }).then(({ body: annotations }) => { shapeId = annotations.shapes[0].id; });
        }));
        cy.intercept('GET', `/api/jobs/${jobId}/data*type=context_image*`).as('rotationContext');
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.wait('@rotationContext');
        cy.get('.cvat-issue-control:not(.cvat-disabled-canvas-control)').click();
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            perspectiveSnapshot($canvas[0], shapeId).then((snapshot) => { before = snapshot.rotation; })
        ));
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => {
            const rect = $canvas[0].getBoundingClientRect();
            rotateScene($canvas[0], { clientX: rect.left + rect.width * 0.7, clientY: rect.top + rect.height * 0.3 });
        });
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            perspectiveSnapshot($canvas[0], shapeId).then((snapshot) => {
                const difference = snapshot.rotation.reduce((sum, value, index) => (
                    sum + Math.abs(value - before[index])
                ), 0);
                expect(difference).to.be.greaterThan(0.01);
            })
        ));
        cy.get('.cvat-issue-control').should('have.class', 'cvat-active-canvas-control');
        cy.get('.cvat-create-issue-dialog').should('not.exist');
        // Even a drag ending at its starting point must remain navigation.
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            perspectiveSnapshot($canvas[0], shapeId).then((snapshot) => ({ canvas: $canvas[0], ...snapshot }))
        )).then(({ canvas, point }) => { rotateScene(canvas, point, true); });
        cy.get('.cvat-create-issue-dialog').should('not.exist');
        cy.get('.cvat-issue-control').should('have.class', 'cvat-active-canvas-control');
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            perspectiveSnapshot($canvas[0], shapeId).then((snapshot) => ({ canvas: $canvas[0], ...snapshot }))
        )).then(({ canvas, point }) => {
            cy.wrap(canvas).trigger('mousedown', { ...point, button: 0, buttons: 1 });
            cy.wrap(canvas).trigger('mouseup', { ...point, button: 0, buttons: 0 });
            cy.wrap(canvas).trigger('click', { ...point, button: 0, detail: 1 });
        });
        cy.get('.cvat-create-issue-dialog').should('be.visible');
        cy.get('.cvat-create-issue-dialog-cancel-button').click();
    });
});

context('2D review with shared canvas popups', () => {
    let taskId;
    before(() => {
        cy.prepareUserSession();
        const { taskSpec, dataSpec } = defaultTaskSpec({
            taskName: '2D review popup regression',
            labelName: 'car',
            serverFiles: ['archive.zip'],
        });
        cy.headlessCreateTask(taskSpec, dataSpec).then((result) => {
            taskId = result.taskId;
            cy.visit(`/tasks/${taskId}/jobs/${result.jobIds[0]}?defaultWorkspace=review`);
        });
    });
    after(() => {
        if (taskId) cy.headlessDeleteTask(taskId);
    });
    it('creates, comments on and resolves an issue using the original 2D popups', () => {
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();
        cy.get('#cvat_canvas_wrapper').click('center');
        cy.get('.cvat-create-issue-dialog').within(() => {
            cy.get('#issue_description').type('Check the 2D boundary');
            cy.contains('button', 'Submit').click();
        });
        cy.get('.cvat-hidden-issue-label').should('contain.text', 'Check the 2D boundary');
        cy.resolveIssue('.cvat-hidden-issue-label', 'Checked in 2D');
        cy.get('.cvat-issue-dialog').should('not.exist');
        cy.get('.cvat-hidden-issue-resolved-indicator').should('exist');
    });
});
