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

function resizeIssueRegion(id, view, dx, dy, cancel = false) {
    const selector = `.cvat-canvas3d-issue-resize-handle[data-issue-id="${id}"][data-view="${view}"]`;
    return cy.get(selector).first().should('be.visible').then(($handle) => {
        const rect = $handle[0].getBoundingClientRect();
        const options = {
            eventConstructor: 'PointerEvent', pointerId: 1, button: 0, isPrimary: true,
        };
        const from = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        cy.wrap($handle).trigger('pointerdown', { ...options, ...from });
        cy.get('body').trigger('pointermove', {
            ...options, clientX: from.clientX + dx, clientY: from.clientY + dy,
        });
        if (cancel) cy.get('body').type('{esc}');
        cy.get('body').trigger('pointerup', options);
    });
}

function afterRender(canvas, callback) {
    return new Cypress.Promise((resolve, reject) => {
        const { scene } = canvas;
        const previous = scene.onAfterRender;
        scene.onAfterRender = (renderer, renderedScene, camera) => {
            scene.onAfterRender = previous;
            try {
                previous.call(scene, renderer, renderedScene, camera);
                resolve(callback(camera));
            } catch (error) {
                reject(error);
            }
        };
    });
}

function getClientPoint(point, bounds) {
    return {
        clientX: bounds.left + ((point.x + 1) / 2) * bounds.width,
        clientY: bounds.top + ((1 - point.y) / 2) * bounds.height,
    };
}

function issueCuboidBodyPoint(canvas, id) {
    return afterRender(canvas, (camera) => {
        const mesh = canvas.scene.getObjectByName(`cvat-issue-cuboid-${id}`);
        const point = mesh.getWorldPosition(mesh.position.clone()).project(camera);
        const bounds = canvas.getBoundingClientRect();
        const { clientX, clientY } = getClientPoint(point, bounds);
        const x = clientX - bounds.left;
        const y = clientY - bounds.top;
        expect(canvas.ownerDocument.elementFromPoint(clientX, clientY)).to.equal(canvas);
        return {
            canvas, x, y, clientX, clientY,
        };
    });
}

function viewSnapshot(canvas, serverId, view = 'perspective', position) {
    return afterRender(canvas, (camera) => {
        const object = canvas.getDrawnObjects().find((item) => item.state.serverID === serverId);
        const mesh = object.cuboid[view];
        const anchor = position ? mesh.position.clone().fromArray(position) :
            mesh.getWorldPosition(mesh.position.clone());
        const projected = anchor.clone().project(camera);
        const rect = canvas.getBoundingClientRect();
        const center = mesh.getWorldPosition(mesh.position.clone());
        const vertices = mesh.geometry.attributes.position;
        const clickPoints = [center, ...Array.from({ length: vertices.count }, (_, index) => (
            center.clone().fromBufferAttribute(vertices, index).applyMatrix4(mesh.matrixWorld).lerp(center, 0.3)
        ))].map((point) => getClientPoint(point.project(camera), rect));
        return {
            rotation: camera.quaternion.toArray(),
            position: camera.position.toArray(),
            up: camera.up.toArray(),
            zoom: camera.zoom,
            localPoint: mesh.worldToLocal(anchor).toArray(),
            clipDepth: projected.z,
            clickPoints,
            point: getClientPoint(projected, rect),
        };
    });
}

function settledPerspectiveSnapshot(canvas, serverId) {
    let previous;
    let frames = 0;
    const capture = () => viewSnapshot(canvas, serverId).then((snapshot) => {
        const pose = [...snapshot.position, ...snapshot.rotation, snapshot.zoom];
        const delta = previous ? Math.max(...pose.map((value, index) => Math.abs(value - previous[index]))) : Infinity;
        if (delta < 1e-7) return snapshot;
        previous = pose;
        frames++;
        if (frames > 240) throw new Error(`Perspective did not settle: ${delta}`);
        return capture();
    });
    return capture();
}

function checkSelectedCuboid(serverId, objectType) {
    cy.get('.cvat-objects-sidebar-state-active-item').should('have.length', 1)
        .and('contain.text', `CUBOID ${objectType.toUpperCase()}`);
    cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
        const objects = $canvas[0].getDrawnObjects();
        const selected = objects.find(({ state }) => state.serverID === serverId && state.objectType === objectType);
        expect(selected, 'linked annotation is drawn').to.exist;
        ['perspective', 'top', 'side', 'front'].forEach((view) => {
            expect(selected.cuboid[view].visible, `linked cuboid visible in ${view}`).to.equal(true);
        });
        objects.filter((object) => object !== selected).forEach(({ cuboid }) => {
            expect(selected.cuboid.perspective.material.opacity, 'linked cuboid has selected opacity')
                .to.be.greaterThan(cuboid.perspective.material.opacity);
            ['top', 'side', 'front'].forEach((view) => {
                expect(cuboid[view].visible, `unrelated cuboid hidden in ${view}`).to.equal(false);
            });
        });
    });
}

function viewCloudPoint(canvas, view = 'perspective') {
    return afterRender(canvas, (camera) => {
        const bounds = canvas.getDrawnObjects().filter(({ cuboid }) => cuboid[view].visible)
            .map(({ cuboid }) => {
                const mesh = cuboid[view];
                const vertices = mesh.geometry.attributes.position;
                const projected = Array.from({ length: vertices.count }, (_, index) => (
                    mesh.position.clone().fromBufferAttribute(vertices, index)
                        .applyMatrix4(mesh.matrixWorld).project(camera)
                ));
                return {
                    left: Math.min(...projected.map((point) => point.x)) - 0.03,
                    right: Math.max(...projected.map((point) => point.x)) + 0.03,
                    top: Math.min(...projected.map((point) => point.y)) - 0.03,
                    bottom: Math.max(...projected.map((point) => point.y)) + 0.03,
                };
            });
        const cloud = canvas.scene.children.find((child) => child.isPoints && child.visible);
        const vertices = cloud.geometry.attributes.position;
        const rect = canvas.getBoundingClientRect();
        for (let index = 0; index < vertices.count; index++) {
            const point = cloud.position.clone().fromBufferAttribute(vertices, index)
                .applyMatrix4(cloud.matrixWorld).project(camera);
            if (Math.abs(point.x) < 0.75 && Math.abs(point.y) < 0.75 && Math.abs(point.z) <= 1 &&
                !bounds.some((box) => point.x >= box.left && point.x <= box.right &&
                    point.y >= box.top && point.y <= box.bottom)) {
                const location = getClientPoint(point, rect);
                if (canvas.ownerDocument.elementFromPoint(location.clientX, location.clientY) !== canvas) continue;
                return location;
            }
        }
        throw new Error('No visible cloud point outside the cuboids');
    });
}

function clickReviewPoint(canvas, point) {
    const rect = canvas.getBoundingClientRect();
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    cy.wrap(canvas).trigger('mousedown', x, y, { ...point, button: 0, buttons: 1 });
    cy.wrap(canvas).trigger('mouseup', x, y, { ...point, button: 0, buttons: 0 });
    cy.wrap(canvas).trigger('click', x, y, { ...point, button: 0, detail: 1 });
}

function checkSimpleIssueForm() {
    cy.get('.cvat-create-issue-dialog').should('be.visible');
    cy.get('#issue_object, #issue_start_frame, #issue_end_frame').should('not.exist');
    cy.get('.cvat-create-issue-dialog input').should('have.length', 1);
}

function placeCloudIssuePoint(view = 'top') {
    const pane = view === 'perspective' ? view : `${view}view`;
    cy.get(`.cvat-canvas3d-${pane} canvas`).then(($canvas) => (
        viewCloudPoint($canvas[0], view).then((point) => ({ canvas: $canvas[0], point }))
    )).then(({ canvas, point }) => { clickReviewPoint(canvas, point); });
}

function rightClickCuboid(serverId, view = 'perspective') {
    const pane = `.cvat-canvas3d-${view === 'perspective' ? view : `${view}view`} canvas`;
    return cy.get(pane).should(($canvas) => {
        const objects = $canvas[0].getDrawnObjects();
        expect(serverId === undefined ? objects.length > 0 : objects.some(({ state }) => state.serverID === serverId),
            'context-menu annotations are rendered').to.equal(true);
    }).then(($canvas) => {
        const canvas = $canvas[0];
        const activeItem = canvas.ownerDocument.querySelector('.cvat-objects-sidebar-state-active-item');
        const clientId = activeItem ? Number(activeItem.id.split('-').pop()) : null;
        const objects = canvas.getDrawnObjects();
        const object = serverId === undefined ? objects.find(({ state }) => state.clientID === clientId) || objects[0] :
            objects.find(({ state }) => state.serverID === serverId);
        expect(object, 'context-menu cuboid is loaded').to.exist;
        return viewSnapshot(canvas, object.state.serverID, view).then(({ clickPoints }) => ({
            canvas,
            point: clickPoints.find((point) => (
                canvas.ownerDocument.elementFromPoint(point.clientX, point.clientY) === canvas
            )),
        }));
    }).then(({ canvas, point }) => {
        expect(point, 'cuboid has an uncovered location to right-click').to.exist;
        const rect = canvas.getBoundingClientRect();
        cy.wrap(canvas).trigger('contextmenu', point.clientX - rect.left, point.clientY - rect.top, {
            ...point, button: 2,
        });
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
    cy.then(() => {
        // Moving the camera can bring an issue label under the release position.
        // A browser only sends the resulting click to the canvas when it is still the target.
        if (canvas.ownerDocument.elementFromPoint(end.clientX, end.clientY) === canvas) {
            cy.wrap(canvas).trigger('click', { ...end, button: 0, detail: 1 });
        }
    });
}

context('3D spatial review', { browser: '!firefox' }, () => {
    let taskId;
    let jobId;
    let firstIssueId;

    function createIssue(message) {
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();
        placeCloudIssuePoint();
        cy.get('.cvat-create-issue-dialog').should('be.visible').within(() => {
            cy.get('#issue_description').type(message);
            cy.intercept('POST', '/api/issues**').as('create3dIssue');
            cy.contains('button', 'Submit').click();
        });
        return cy.wait('@create3dIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.position).to.have.length(3);
            expect(response.body.position.every(Number.isFinite)).to.equal(true);
            expect(response.body.object_id).to.equal(null);
            expect(response.body.object_type).to.equal(null);
            expect(response.body.end_frame).to.equal(null);
            return response.body.id;
        });
    }

    before(() => {
        cy.prepareUserSession();
        const { taskSpec, dataSpec } = defaultTaskSpec({
            taskName: '3D spatial review regression',
            labelName: 'car',
            attributes: [
                { name: 'visibility', type: 'Text', values: 'unknown' },
                { name: 'condition', type: 'Text', values: 'unknown' },
            ],
            serverFiles: ['test_canvas3d.zip'],
        });
        taskSpec.labels.push({ name: 'car without attributes', type: 'cuboid', attributes: [] });
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

    it('creates independent cuboid regions and persists moves and resizes without changing annotations', () => {
        let issueId;
        let annotations;
        let position;
        cy.request(`/api/jobs/${jobId}/annotations`).then(({ body }) => { annotations = body; });
        cy.get('.cvat-issue-point-control').should('be.visible');
        cy.get('.cvat-issue-cuboid-control').should('be.visible').click();
        cy.get('.cvat-issue-cuboid-control').should('have.class', 'cvat-active-canvas-control');
        cy.get('.cvat-issue-point-control').should('not.have.class', 'cvat-active-canvas-control');
        cy.get('.cvat-canvas3d-perspective canvas').trigger('mousemove', 200, 150);
        cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            expect($canvas[0].scene.getObjectByName('drawTemplate')).to.exist;
        });
        cy.get('.cvat-canvas3d-perspective canvas').dblclick(200, 150);
        checkSimpleIssueForm();
        cy.get('#issue_description').type('Review this missing object region');
        resizeIssueRegion(0, 'top', 18, 14);
        cy.intercept('POST', '/api/issues**').as('createCuboidIssue');
        cy.get('.cvat-create-issue-dialog-submit-button').click();
        cy.wait('@createCuboidIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            issueId = response.body.id;
            position = response.body.position;
            expect(position).to.have.length(16);
            expect(position.slice(6, 9)).not.to.deep.equal([1, 1, 1]);
            expect(response.body.object_id).to.equal(null);
            expect(response.body.object_type).to.equal(null);
        });
        ['perspective', 'topview', 'sideview', 'frontview'].forEach((view) => {
            cy.get(`.cvat-canvas3d-${view} canvas`).should(($canvas) => {
                expect($canvas[0].scene.getObjectByName(`cvat-issue-cuboid-${issueId}`)).to.exist;
            }).then(($canvas) => issueCuboidBodyPoint($canvas[0], issueId))
                .then(({ canvas, x, y }) => cy.wrap(canvas).realClick({ x, y }));
            if (view === 'perspective') {
                cy.get('.cvat-issue-dialog').should('not.exist');
            } else {
                cy.get('.cvat-issue-dialog').should('contain.text', 'Review this missing object region');
                cy.get('.cvat-canvas3d-issue-resize-handle').should('exist');
                cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
                cy.get('.cvat-issue-dialog').should('not.exist');
            }
        });
        cy.then(() => cy.get(`#cvat-hidden-issue-label-${issueId}-perspective`).click());
        cy.get('.cvat-issue-dialog').should('contain.text', 'Review this missing object region');
        cy.then(() => cy.intercept('PATCH', `/api/issues/${issueId}`).as('editCuboidIssue'));
        cy.then(() => dragMarker(issueId, 'top', 18, 12, false, true));
        cy.wait('@editCuboidIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(200);
            expect(response.body.position.slice(3)).to.deep.equal(position.slice(3));
            expect(response.body.position.slice(0, 3)).not.to.deep.equal(position.slice(0, 3));
            position = response.body.position;
        });
        ['top', 'side', 'front'].forEach((view) => {
            cy.then(() => resizeIssueRegion(issueId, view, 12, 10));
            cy.wait('@editCuboidIssue').then(({ response }) => {
                expect(response.statusCode).to.equal(200);
                expect(response.body.position.slice(6, 9)).not.to.deep.equal(position.slice(6, 9));
                expect(response.body.position.slice(6, 9).every((value) => value > 0)).to.equal(true);
                position = response.body.position;
            });
        });
        cy.then(() => resizeIssueRegion(issueId, 'side', 12, 12, true));
        cy.then(() => cy.request(`/api/issues/${issueId}`).then(({ body }) => {
            expect(body.position).to.deep.equal(position);
        }));
        cy.then(() => cy.intercept({ method: 'PATCH', url: `/api/issues/${issueId}`, times: 1 }, {
            statusCode: 403, body: { detail: 'Test rejected resize' },
        }).as('rejectedResize'));
        cy.then(() => resizeIssueRegion(issueId, 'top', 12, 12));
        cy.wait('@rejectedResize');
        cy.contains('Could not move the issue').should('be.visible');
        cy.reload();
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-dialog').should('contain.text', 'Review this missing object region');
        cy.get('.cvat-canvas3d-issue-resize-handle').should('have.length.at.least', 12);
        cy.then(() => cy.request(`/api/issues/${issueId}`).then(({ body }) => {
            expect(body.position).to.deep.equal(position);
        }));
        cy.request(`/api/jobs/${jobId}/annotations`).then(({ body }) => expect(body).to.deep.equal(annotations));
        cy.get('.cvat-issue-dialog-remove-button').click();
        cy.get('.cvat-modal-confirm-remove-issue').contains('button', 'Delete').click();
        cy.get('.cvat-modal-confirm-remove-issue').should('not.exist');
    });

    it('moves the selected cuboid when issue regions overlap', () => {
        const position = [0, 0, 1, 0, 0, 0, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0];
        const ids = [];
        cy.getCookie('csrftoken').then((cookie) => {
            ['First snapshot', 'Second snapshot'].forEach((message) => cy.request({
                method: 'POST',
                url: '/api/issues',
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    job: jobId, frame: 0, position, message,
                },
            }).then(({ body }) => { ids.push(body.id); }));
        });
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review&frame=0`);
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${ids[0]}`).click());
        cy.get('.cvat-issue-dialog').should('contain.text', 'First snapshot');
        cy.intercept('PATCH', '/api/issues/*').as('moveOverlappingIssue');
        cy.get('.cvat-canvas3d-topview canvas').then(($canvas) => issueCuboidBodyPoint($canvas[0], ids[0]))
            .then(({ canvas, clientX, clientY }) => {
                const pointer = {
                    eventConstructor: 'PointerEvent', pointerId: 1, button: 0, isPrimary: true,
                };
                cy.wrap(canvas).trigger('pointerdown', { ...pointer, clientX, clientY });
                cy.get('body').trigger('pointermove', {
                    ...pointer, clientX: clientX + 18, clientY: clientY + 12,
                });
                cy.get('body').trigger('pointerup', pointer);
            });
        cy.wait('@moveOverlappingIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(200);
            expect(response.body.id).to.equal(ids[0]);
            expect(response.body.position).not.to.deep.equal(position);
        });
        cy.then(() => cy.request(`/api/issues/${ids[1]}`).then(({ body }) => {
            expect(body.position).to.deep.equal(position);
        }));
        cy.getCookie('csrftoken').then((cookie) => ids.forEach((id) => cy.request({
            method: 'DELETE', url: `/api/issues/${id}`, headers: { 'X-CSRFToken': cookie.value },
        })));
    });

    it('opens a sidebar issue when the Perspective anchor is off-screen', () => {
        let issueId;
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'POST',
            url: '/api/issues',
            headers: { 'X-CSRFToken': cookie.value },
            body: {
                job: jobId, frame: 0, position: [0, 0, 1], message: 'Review an off-screen location',
            },
        }).then(({ body }) => { issueId = body.id; }));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review&frame=0`);
        cy.then(() => cy.get(`#cvat-hidden-issue-label-${issueId}-perspective`).should('be.visible'));
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => afterRender($canvas[0], (camera) => {
            camera.setViewOffset(100, 100, 200, 0, 100, 100);
        }));
        cy.then(() => cy.get(`#cvat-hidden-issue-label-${issueId}-perspective`).should('not.exist'));
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-dialog').should('be.visible').and('contain.text', 'Review an off-screen location');
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE', url: `/api/issues/${issueId}`, headers: { 'X-CSRFToken': cookie.value },
        }));
    });

    it('creates an independent Perspective point on the first single click and persists it', () => {
        let issueId;
        let position;
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.get('.cvat-issue-point-control').click();
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            viewCloudPoint($canvas[0]).then((point) => ({ canvas: $canvas[0], point }))
        )).then(({ canvas, point }) => {
            const rect = canvas.getBoundingClientRect();
            cy.wrap(canvas).realClick({ x: point.clientX - rect.left, y: point.clientY - rect.top });
        });
        checkSimpleIssueForm();
        cy.get('#issue_description').type('Review this Perspective cloud point');
        cy.intercept('POST', '/api/issues**').as('perspectiveCloudIssue');
        cy.get('.cvat-create-issue-dialog-submit-button').click();
        cy.wait('@perspectiveCloudIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            issueId = response.body.id;
            position = response.body.position;
            expect(position).to.have.length(3);
            expect(response.body.object_id).to.equal(null);
            expect(response.body.object_type).to.equal(null);
            expect(response.body.frame).to.equal(0);
            expect(response.body.end_frame).to.equal(null);
        });
        cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            const cloud = $canvas[0].scene.children.find((child) => child.isPoints);
            const vertices = cloud.geometry.attributes.position;
            const vector = cloud.position.clone();
            let found = false;
            for (let index = 0; index < vertices.count && !found; index++) {
                vector.fromBufferAttribute(vertices, index).applyMatrix4(cloud.matrixWorld);
                found = Math.abs(vector.x - position[0]) < 1e-6 &&
                    Math.abs(vector.y - position[1]) < 1e-6 && Math.abs(vector.z - position[2]) < 1e-6;
            }
            expect(found, 'issue is anchored to an actual cloud sample').to.equal(true);
        });
        cy.reload();
        cy.then(() => cy.get(`#cvat-hidden-issue-label-${issueId}-perspective`)
            .should('contain.text', 'Review this Perspective cloud point'));
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE', url: `/api/issues/${issueId}`, headers: { 'X-CSRFToken': cookie.value },
        }));
    });

    it('keeps a newer draft when a previous frame’s issue finishes saving', () => {
        let releaseResponse;
        cy.intercept('POST', '/api/issues**', (request) => request.continue(() => (
            new Cypress.Promise((resolve) => { releaseResponse = resolve; })
        ))).as('pendingIssue');
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review&frame=0`);
        cy.get('.cvat-issue-point-control').click();
        placeCloudIssuePoint('perspective');
        cy.get('#issue_description').type('Issue on the previous frame');
        cy.get('.cvat-create-issue-dialog-submit-button').click();
        cy.wrap(null).should(() => expect(releaseResponse).to.be.a('function'));

        cy.get('.cvat-player-next-button').click();
        cy.checkFrameNum(1);
        cy.get('.cvat-issue-point-control').click();
        placeCloudIssuePoint('perspective');
        cy.get('#issue_description').type('Second draft');
        cy.then(() => releaseResponse());
        cy.wait('@pendingIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            cy.getCookie('csrftoken').then((cookie) => cy.request({
                method: 'DELETE', url: `/api/issues/${response.body.id}`, headers: { 'X-CSRFToken': cookie.value },
            }));
        });
        cy.get('#issue_description').should('have.value', 'Second draft');
        cy.get('.cvat-create-issue-dialog-cancel-button').click();
    });

    it('renders review labels and point markers as sprites while retaining keyboard access', () => {
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`, {
            onBeforeLoad: (win) => Object.defineProperty(win, 'devicePixelRatio', { value: 2 }),
        });
        createIssue('Review this sprite anchor').then((id) => {
            ['perspective', 'top', 'side', 'front'].forEach((view) => {
                const pane = view === 'perspective' ? view : `${view}view`;
                cy.get(`.cvat-canvas3d-${pane} canvas`).should(($canvas) => {
                    const {
                        scene, width, height, clientWidth, clientHeight,
                    } = $canvas[0];
                    expect(width).to.equal(clientWidth * 2);
                    expect(height).to.equal(clientHeight * 2);
                    ['point', 'label'].forEach((kind) => {
                        const sprite = scene.getObjectByName(`cvat-issue-sprite-${view}:${id}:${kind}`);
                        expect(sprite?.isSprite, `${kind} is rendered in the scene`).to.equal(true);
                        expect(sprite.material.map.isCanvasTexture).to.equal(true);
                        expect(sprite.material.opacity).to.equal(1);
                        expect(sprite.material.sizeAttenuation, 'readable at every zoom').to.equal(false);
                    });
                });
            });
            cy.get(`#cvat-hidden-issue-label-${id}-top`).focus();
            cy.get(`#cvat-hidden-issue-label-${id}-top`).type('{enter}');
            cy.get('.cvat-issue-dialog').should('contain.text', 'Review this sprite anchor');
            cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
            cy.get('.cvat-issues-sidebar-shown-issues').click();
            cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
                expect($canvas[0].scene.children.some((child) => child.isSprite)).to.equal(false);
            });
            cy.get('.cvat-issues-sidebar-hidden-issues').click();
            cy.get(`#cvat-hidden-issue-label-${id}-perspective`).should('be.visible');
        });
    });

    it('projects point and cuboid issues onto calibrated related images without labels', () => {
        const issueIds = [];
        // The test camera translates LiDAR coordinates by [0.2, 0, 1.7].
        const positions = [
            [-0.2, 0, 8.3],
            [1.8, 0, 8.3, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0],
        ];
        cy.getCookie('csrftoken').then((cookie) => {
            positions.forEach((position) => cy.request({
                method: 'POST',
                url: '/api/issues',
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    job: jobId, frame: 0, position, message: 'Camera projection issue',
                },
            }).then(({ body }) => { issueIds.push(body.id); }));
        });
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.then(() => {
            cy.get(`.cvat-context-image-issue-point[data-issue-id="${issueIds[0]}"]`).first().should(($marker) => {
                expect(Number($marker.attr('cx'))).to.be.closeTo(609.6, 0.1);
                expect(Number($marker.attr('cy'))).to.be.closeTo(172.9, 0.1);
            });
            cy.get(`.cvat-context-image-issue-cuboid[data-issue-id="${issueIds[1]}"]`).first()
                .find('polygon').should('have.length', 6);
        });
        cy.get('.cvat-context-image-issue-projections').find('text').should('not.exist');
        cy.getCookie('csrftoken').then((cookie) => {
            issueIds.forEach((id) => cy.request({
                method: 'DELETE', url: `/api/issues/${id}`, headers: { 'X-CSRFToken': cookie.value },
            }));
        });
    });

    it('clips issue labels to the visible cuboid region in orthographic views', () => {
        const fixtureId = 2147483000;
        const ids = [];
        let labelId;
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => { labelId = body.results[0].id; });
        [4, -4, 1.2].forEach((depth) => {
            cy.getCookie('csrftoken').then((cookie) => cy.request({
                method: 'POST',
                url: '/api/issues',
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    job: jobId,
                    frame: 0,
                    position: [0, depth, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
                    message: `Review region at depth ${depth}`,
                },
            }).then(({ body }) => { ids.push(body.id); }));
        });
        // Isolate the focused annotation in the browser without editing the task's annotations.
        cy.intercept('GET', `/api/jobs/${jobId}/annotations*`, (request) => request.continue((response) => {
            const { body } = response;
            body.shapes = [{
                id: fixtureId,
                frame: 0,
                label_id: labelId,
                type: 'cuboid',
                points: [0, 0, 1, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0],
                attributes: [],
                occluded: false,
                z_order: 0,
                rotation: 0,
                group: 0,
                source: 'manual',
                elements: [],
            }];
            body.tracks = [];
            body.tags = [];
        }));
        cy.intercept({ method: 'GET', pathname: '/api/issues' }, (request) => request.continue((response) => {
            const { body } = response;
            body.results = body.results.filter((issue) => ids.includes(issue.id));
            body.count = body.results.length;
        }));
        cy.intercept({ method: 'GET', pathname: '/api/comments' }, (request) => request.continue((response) => {
            const { body } = response;
            body.results = body.results.filter((comment) => ids.includes(comment.issue));
            body.count = body.results.length;
        }));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.contains('[role="tab"]', 'Objects').click();
        cy.get('.cvat-objects-sidebar-state-item').first().trigger('mouseover');
        cy.get('.cvat-canvas3d-sideview canvas').should(($canvas) => {
            const object = $canvas[0].getDrawnObjects().find(({ state }) => state.serverID === fixtureId);
            expect(object.cuboid.side.visible, 'annotation depth slice is active').to.equal(true);
        });
        cy.then(() => {
            ids.slice(0, 2).forEach((id) => {
                cy.get(`#cvat-hidden-issue-label-${id}-side`).should('not.exist');
                cy.get(`#cvat-hidden-issue-label-${id}-perspective`).should('be.visible');
            });
            // Its center is outside the slice, but part of its volume is still visible.
            cy.get(`#cvat-hidden-issue-label-${ids[2]}-side`).should('be.visible');
            cy.get(`#cvat-hidden-issue-label-${ids[0]}-perspective`).click();
            cy.get(`#cvat-hidden-issue-label-${ids[0]}-side`).should('be.visible');
        });
        cy.get('.cvat-canvas3d-issue-resize-handle').should('have.length.at.least', 12);
        cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
        cy.getCookie('csrftoken').then((cookie) => ids.forEach((id) => cy.request({
            method: 'DELETE', url: `/api/issues/${id}`, headers: { 'X-CSRFToken': cookie.value },
        })));
    });

    it('snapshots the cuboid geometry for both context menu issue actions', () => {
        const points = [0, 0, 1, 0, 0, 0.25, 1.5, 1, 2, 0, 0, 0, 0, 0, 0, 0];
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
                        points,
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
        cy.get('.cvat-canvas3d-perspective').should('be.visible');
        cy.get('.cvat-canvas3d-perspective .cvat-spinner-container').should('not.exist');
        cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
        cy.get('#cvat-objects-sidebar-state-item-1').should('have.class', 'cvat-objects-sidebar-state-active-item');
        rightClickCuboid();
        cy.intercept('POST', '/api/issues**').as('cuboidIssue');
        cy.contains('.cvat-context-menu-item', 'Quick issue: incorrect position').click();
        cy.wait('@cuboidIssue').then(({ request, response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.position).to.deep.equal(points);
            expect(request.body).not.to.include.any.keys('object_id', 'object_type');
            expect(response.body.object_type).to.equal(null);
            expect(response.body.object_id).to.equal(null);
            expect(response.body.view.position).to.have.length(3);
            expect(response.body.view.target).to.have.length(3);
            expect(response.body.view.zoom).to.be.greaterThan(0);
            cy.get(`#cvat-hidden-issue-label-${response.body.id}-perspective`).click();
        });
        cy.get('.cvat-issue-dialog').should('be.visible');
        cy.get('.cvat-objects-sidebar-state-active-item').should('not.exist');
        ['top', 'side', 'front'].forEach((view) => {
            cy.get(`.cvat-canvas3d-${view}view canvas`).should(($canvas) => {
                const { cuboid } = $canvas[0].getDrawnObjects().find(({ state }) => state.clientID === 1);
                expect(cuboid[view].visible, `annotation visible in ${view}`).to.equal(true);
                expect(cuboid[view].getObjectByName('edges')).to.exist;
            });
        });
        cy.get('.cvat-canvas3d-perspective canvas').trigger('mousemove', 50, 50);
        cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
        cy.get('.cvat-issue-dialog').should('not.exist');
        cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            const { cuboid } = $canvas[0].getDrawnObjects().find(({ state }) => state.clientID === 1);
            ['top', 'side', 'front'].forEach((view) => expect(cuboid[view].visible).to.equal(false));
        });
        cy.get('#cvat-objects-sidebar-state-item-1').find('.cvat-object-item-button-lock-enabled').click();
        cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
        cy.get('.cvat-canvas3d-topview canvas').should(($canvas) => {
            const { state, cuboid } = $canvas[0].getDrawnObjects().find((object) => object.state.clientID === 1);
            expect(state.lock).to.equal(false);
            expect(cuboid.top.visible).to.equal(true);
            expect($canvas[0].scene.getObjectByName('2DResizeHelper_0')).not.to.exist;
        });
        rightClickCuboid();
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.get('.cvat-create-issue-dialog').should('be.visible');
        cy.get('.cvat-issue-dialog').should('not.exist');
        cy.get('.cvat-canvas3d-topview canvas').should(($canvas) => {
            const { scene } = $canvas[0];
            const draft = scene.getObjectByName('cvat-issue-cuboid-0');
            expect(draft.position.toArray()).to.deep.equal(points.slice(0, 3));
            expect(draft.scale.toArray()).to.deep.equal(points.slice(6, 9));
            expect(scene.getObjectByName('2DResizeHelper_0')).not.to.exist;
        });
        resizeIssueRegion(0, 'top', 12, 10);
        cy.get('.cvat-create-issue-dialog').within(() => {
            cy.get('#issue_description').type('Check the cuboid extents');
            cy.contains('button', 'Submit').click();
        });
        cy.wait('@cuboidIssue').then(({ request, response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.position.slice(6, 9)).not.to.deep.equal(points.slice(6, 9));
            expect(request.body).not.to.include.any.keys('object_id', 'object_type');
            cy.get('.cvat-canvas3d-topview canvas').should(($canvas) => {
                const { state } = $canvas[0].getDrawnObjects().find((object) => object.state.clientID === 1);
                expect(state.points).to.deep.equal(points);
            });
            cy.removeIssue(`#cvat-hidden-issue-label-${response.body.id}-perspective`);
            cy.get(`#cvat-hidden-issue-label-${response.body.id}-perspective`).should('not.exist');
        });
        cy.changeWorkspace('Standard 3D');
        cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
        cy.get('.cvat-canvas3d-topview canvas').should(($canvas) => {
            expect($canvas[0].scene.getObjectByName('2DResizeHelper_0')).to.exist;
        });
    });

    it('keeps review points and labels below context menus, discussions and modal windows', () => {
        const issueIds = [];
        const checkCover = (cover, target) => {
            const bounds = cover.getBoundingClientRect();
            const rect = target.getBoundingClientRect();
            const left = Math.max(bounds.left, rect.left);
            const top = Math.max(bounds.top, rect.top);
            const right = Math.min(bounds.right, rect.right);
            const bottom = Math.min(bounds.bottom, rect.bottom);
            expect(right - left, 'test elements overlap horizontally').to.be.greaterThan(0);
            expect(bottom - top, 'test elements overlap vertically').to.be.greaterThan(0);
            const element = cover.ownerDocument.elementFromPoint((left + right) / 2, (top + bottom) / 2);
            expect(cover.contains(element), 'window receives input above the review overlay').to.equal(true);
        };

        cy.getCookie('csrftoken').then((cookie) => {
            ['First overlapping review issue', 'Second overlapping review issue'].forEach((message) => {
                cy.request({
                    method: 'POST',
                    url: '/api/issues',
                    headers: { 'X-CSRFToken': cookie.value },
                    body: {
                        job: jobId, frame: 0, position: [0, 0, 1], message,
                    },
                }).then(({ body }) => { issueIds.push(body.id); });
            });
        });
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.then(() => cy.get(`.cvat-canvas3d-issue-region[data-issue-id="${issueIds[1]}"][data-view="perspective"]`)
            .then(($marker) => {
                const rect = $marker[0].getBoundingClientRect();
                cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
                cy.get('#cvat-objects-sidebar-state-item-1')
                    .should('have.class', 'cvat-objects-sidebar-state-active-item');
                cy.get('.cvat-canvas3d-perspective canvas').trigger('contextmenu', {
                    button: 2, clientX: rect.left + rect.width / 2 - 12, clientY: rect.top + rect.height / 2 - 12,
                });
                cy.get('.cvat-canvas-context-menu').should('be.visible').should(($menu) => {
                    checkCover($menu[0], $marker[0]);
                    checkCover($menu[0], $menu[0].ownerDocument
                        .getElementById(`cvat-hidden-issue-label-${issueIds[1]}-perspective`));
                });
            }));
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.get('.cvat-create-issue-dialog').should('be.visible').should(($dialog) => {
            checkCover($dialog[0], $dialog[0].ownerDocument
                .getElementById(`cvat-hidden-issue-label-${issueIds[1]}-perspective`));
        });
        cy.get('.cvat-create-issue-dialog-cancel-button').click();

        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[0]}`).click());
        cy.get('.cvat-issue-dialog').should('be.visible').should(($dialog) => {
            checkCover($dialog[0], $dialog[0].ownerDocument
                .getElementById(`cvat-hidden-issue-label-${issueIds[1]}-perspective`));
        });
        cy.get('.cvat-issue-restore-view').should('not.exist');
        cy.openSettings();
        cy.get('.ant-modal-wrap').filter(':visible').should(($modal) => {
            $modal[0].ownerDocument.querySelectorAll('.cvat-canvas3d-issue-region, .cvat-hidden-issue-label')
                .forEach((target) => { checkCover($modal[0], target); });
        });
        cy.closeSettings();
        cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
    });

    it('drags draft and saved markers in orthographic planes and restores canceled or failed moves', () => {
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review&frame=1`);
        cy.checkFrameNum(1);
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();
        placeCloudIssuePoint();
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
            const focusIssue = () => {
                cy.contains('[role="tab"]', 'Issues').click();
                cy.get(`#cvat-objects-sidebar-issue-item-${id}`).click();
                cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
            };
            [['top', 2], ['side', 1], ['front', 0]].forEach(([view, depthAxis]) => {
                cy.then(() => {
                    focusIssue();
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
            focusIssue();
            cy.get(`#cvat-hidden-issue-label-${id}-perspective`).should('contain.text', 'Move this review point');
            cy.request(`/api/issues/${id}`).then(({ body }) => expect(body.position).to.deep.equal(position));
            dragMarker(id, 'top', 24, 12, true);
            cy.request(`/api/issues/${id}`).then(({ body }) => expect(body.position).to.deep.equal(position));
            focusIssue();
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

    it('snapshots the current track frame and keeps the region after annotation deletion', () => {
        let trackId;
        let issueId;
        let savedPosition;
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
        rightClickCuboid(trackId);
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        checkSimpleIssueForm();
        cy.get('#issue_description').type('Check this track on the current frame');
        cy.intercept('POST', '/api/issues**').as('trackFrameIssue');
        cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
        cy.wait('@trackFrameIssue').then(({ response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.object_type).to.equal(null);
            expect(response.body.object_id).to.equal(null);
            expect(response.body.position).to.deep.equal([1, ...points.slice(1)]);
            expect(response.body.frame).to.equal(1);
            expect(response.body.end_frame).to.equal(null);
            issueId = response.body.id;
        });
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`)
            .should('contain.text', 'Check this track on the current frame')
            .and('not.contain.text', 'Frame 1')
            .and('not.contain.text', 'Track #'));
        [0, 2].forEach((frame) => {
            cy.goCheckFrameNumber(frame);
            cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).should('not.exist'));
            cy.then(() => cy.get(`#cvat-hidden-issue-label-${issueId}-perspective`).should('not.exist'));
        });
        cy.get('.cvat-issues-sidebar-previous-frame').click();
        cy.checkFrameNum(1);
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-canvas3d-issue-resize-handle').should('exist');
        cy.then(() => {
            cy.intercept('PATCH', `/api/issues/${issueId}`).as('moveTrackFrameIssue');
            dragMarker(issueId, 'top', 10, -6, false, true);
            cy.wait('@moveTrackFrameIssue').then(({ response }) => {
                expect(response.body.object_id).to.equal(null);
                savedPosition = response.body.position;
                expect(response.body.end_frame).to.equal(null);
            });
        });
        cy.reload();
        cy.goCheckFrameNumber(1);
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-dialog').should('not.contain.text', 'Frame 1').and('not.contain.text', 'Track #');
        cy.get('.cvat-issue-dialog input').type('The position needs correction');
        cy.get('.cvat-issue-dialog').contains('button', 'Comment').click();
        cy.get('.cvat-issue-dialog').contains('The position needs correction').should('be.visible');
        cy.get('.cvat-issue-dialog').contains('button', 'Resolve').click();

        // Removing the source annotation leaves the issue's own cuboid intact.
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE',
            url: `/api/jobs/${jobId}/annotations`,
            headers: { 'X-CSRFToken': cookie.value },
        }));
        cy.reload();
        cy.goCheckFrameNumber(1);
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-dialog').should('be.visible').and('contain.text', 'The position needs correction');
        cy.get('.cvat-issue-dialog').contains('button', 'Reopen').click();
        cy.then(() => cy.request(`/api/issues/${issueId}`).then(({ body }) => {
            expect(body.object_id).to.equal(null);
            expect(body.position).to.deep.equal(savedPosition);
            expect(body.end_frame).to.equal(null);
            expect(body.resolved).to.equal(false);
        }));
    });

    it('snapshots an unsaved cuboid without saving the annotation', () => {
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
        cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID SHAPE').trigger('mouseover');
        rightClickCuboid();
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        checkSimpleIssueForm();
        cy.get('#issue_description').type('Review this newly created cuboid');
        cy.intercept('POST', '/api/issues**').as('newCuboidIssue');
        cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
        cy.wait('@newCuboidIssue').then(({ request, response }) => {
            expect(response.statusCode).to.equal(201);
            expect(response.body.position).to.have.length(16);
            expect(request.body).not.to.include.any.keys('object_id', 'object_type');
            expect(response.body.object_id).to.equal(null);
            cy.request(`/api/jobs/${jobId}/annotations`).then(({ body }) => {
                expect(body.shapes).to.have.length(0);
            });
        });
        cy.reload();
        cy.contains('[role="tab"]', 'Issues').click();
        cy.contains('.cvat-objects-sidebar-issue-item', 'Review this newly created cuboid')
            .should('not.contain.text', 'car · Shape');
    });

    it('keeps labels and marker hit areas within their panes near edges and after resizing', () => {
        let issueId;
        const viewport = [Cypress.config('viewportWidth'), Cypress.config('viewportHeight')];
        const checkLabels = () => cy.get('.cvat-canvas3d-issues .cvat-hidden-issue-label').should(($labels) => {
            $labels.each((_, label) => {
                const view = label.id.split('-').pop();
                const selector = view === 'perspective' ? view : `${view}view`;
                const canvas = label.ownerDocument.querySelector(`.cvat-canvas3d-${selector} canvas`);
                const pane = canvas.getBoundingClientRect();
                const rect = label.getBoundingClientRect();
                expect(rect.left, `${view} label left`).to.be.at.least(pane.left);
                expect(rect.right, `${view} label right`).to.be.at.most(pane.right);
                expect(rect.top, `${view} label top`).to.be.at.least(pane.top);
                expect(rect.bottom, `${view} label bottom`).to.be.at.most(pane.bottom);
            });
        });
        // Earlier cases leave pins at the same location; isolate the edge hit-area check.
        cy.request(`/api/issues?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => {
            body.results.forEach((issue) => cy.request({
                method: 'DELETE',
                url: `/api/issues/${issue.id}`,
                headers: { 'X-CSRFToken': cookie.value },
            }));
        }));
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'POST',
            url: '/api/issues',
            headers: { 'X-CSRFToken': cookie.value },
            body: {
                job: jobId,
                frame: 0,
                position: [0, 0, 1],
                message: 'Keep this long review label inside its own point cloud view',
            },
        }).then(({ body }) => { issueId = body.id; }));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.intercept('PATCH', `/api/issues/${issueId}`).as('moveToPaneEdge'));
        ['top', 'side', 'front'].forEach((view) => {
            cy.then(() => {
                cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click();
                cy.get('.cvat-issue-dialog-header [aria-label="close"]').click();
                const selector = `.cvat-canvas3d-issue-region[data-issue-id="${issueId}"][data-view="${view}"]`;
                cy.get(selector).then(($marker) => {
                    const marker = $marker[0];
                    const rect = marker.getBoundingClientRect();
                    const pane = marker.ownerDocument.querySelector(`.cvat-canvas3d-${view}view canvas`)
                        .getBoundingClientRect();
                    dragMarker(issueId, view, pane.right - 2 - (rect.left + rect.width / 2),
                        pane.bottom - 2 - (rect.top + rect.height / 2));
                    cy.wait('@moveToPaneEdge').its('response.statusCode').should('equal', 200);
                });
                checkLabels();
                cy.get(selector).should(($marker) => {
                    const marker = $marker[0];
                    const pane = marker.ownerDocument.querySelector(`.cvat-canvas3d-${view}view canvas`)
                        .getBoundingClientRect();
                    const outside = marker.ownerDocument.elementFromPoint(pane.right + 2, pane.bottom - 2);
                    expect(outside === marker, 'marker cannot intercept input in the next pane').to.equal(false);
                });
            });
        });
        cy.viewport(900, 650);
        checkLabels();
        cy.viewport(...viewport);
        checkLabels();
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
        rightClickCuboid();
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.get('#issue_description').type('Keep this issue description');
        cy.get('.cvat-canvas3d-topview').closest('.cvat-canvas-grid-item')
            .find('.cvat-grid-item-fullscreen-handler').click();
        cy.get('#issue_description').should('be.visible').and('have.value', 'Keep this issue description');
        checkSimpleIssueForm();
        cy.get('.cvat-canvas-grid-fullscreen-item .cvat-grid-item-fullscreen-handler').click();
        cy.get('.cvat-context-image-wrapper').closest('.cvat-canvas-grid-item')
            .find('.cvat-grid-item-fullscreen-handler').click();
        cy.get('.cvat-create-issue-dialog').should('not.be.visible');
        cy.get('.cvat-canvas-grid-fullscreen-item .cvat-grid-item-fullscreen-handler').click();
        cy.get('#issue_description').should('have.value', 'Keep this issue description');
        checkSimpleIssueForm();
        cy.get('.cvat-create-issue-dialog-cancel-button').click();
    });

    it('rotates the scene while placing an issue without treating a drag as a point', () => {
        let shapeId;
        let before;
        let draftView;
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
            viewSnapshot($canvas[0], shapeId).then((snapshot) => { before = snapshot.rotation; })
        ));
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => {
            const rect = $canvas[0].getBoundingClientRect();
            rotateScene($canvas[0], { clientX: rect.left + rect.width * 0.7, clientY: rect.top + rect.height * 0.3 });
        });
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            viewSnapshot($canvas[0], shapeId).then((snapshot) => {
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
            viewSnapshot($canvas[0], shapeId).then((snapshot) => ({ canvas: $canvas[0], ...snapshot }))
        )).then(({ canvas, point }) => { rotateScene(canvas, point, true); });
        cy.get('.cvat-create-issue-dialog').should('not.exist');
        cy.get('.cvat-issue-control').should('have.class', 'cvat-active-canvas-control');
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            viewSnapshot($canvas[0], shapeId).then((snapshot) => ({ canvas: $canvas[0], ...snapshot }))
        )).then(({ canvas, point }) => {
            const rect = canvas.getBoundingClientRect();
            cy.wrap(canvas).realClick({ x: point.clientX - rect.left, y: point.clientY - rect.top });
        });
        cy.get('.cvat-create-issue-dialog').should('be.visible');
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            settledPerspectiveSnapshot($canvas[0], shapeId).then((snapshot) => { draftView = snapshot; })
        ));
        // A follow-up double-click while entering the comment must not fit the scene.
        cy.get('.cvat-canvas3d-perspective canvas').realClick({ x: 50, y: 70, clickCount: 2 });
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            settledPerspectiveSnapshot($canvas[0], shapeId).then((snapshot) => {
                ['position', 'rotation'].forEach((property) => {
                    snapshot[property].forEach((value, index) => (
                        expect(value).to.be.closeTo(draftView[property][index], 1e-5)
                    ));
                });
                expect(snapshot.zoom).to.equal(draftView.zoom);
            })
        ));
        checkSimpleIssueForm();
        cy.get('.cvat-create-issue-dialog-cancel-button').click();
    });

    it('creates independent point and cuboid issues from the matching tools', () => {
        let shapeId;
        let trackId;
        const createdIssues = [];
        const points = [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE',
            url: `/api/jobs/${jobId}/annotations`,
            headers: { 'X-CSRFToken': cookie.value },
        }));
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => (
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    tags: [],
                    shapes: [{
                        type: 'cuboid',
                        frame: 0,
                        label_id: body.results[0].id,
                        points: [-2, ...points.slice(1)],
                        attributes: [],
                        occluded: false,
                        z_order: 0,
                        rotation: 0,
                    }],
                    tracks: [{
                        frame: 0,
                        label_id: body.results[0].id,
                        attributes: [],
                        shapes: [0, 2].map((frame) => ({
                            frame,
                            type: 'cuboid',
                            points: [2, ...points.slice(1)],
                            attributes: [],
                            occluded: false,
                            outside: false,
                            z_order: 0,
                            rotation: 0,
                        })),
                    }],
                },
            }).then(({ body: annotations }) => {
                shapeId = annotations.shapes[0].id;
                trackId = annotations.tracks[0].id;
            })
        )));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            expect($canvas[0].getDrawnObjects()).to.have.length(2);
        });
        cy.get('.cvat-canvas3d-perspective .cvat-spinner-container').should('not.exist');
        cy.intercept('POST', '/api/issues**').as('explicitIssueTarget');

        function submitIssue(cuboidPoints) {
            checkSimpleIssueForm();
            cy.get('#issue_description').type('Check this annotation or location');
            cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
            cy.wait('@explicitIssueTarget').then(({ request, response }) => {
                expect(request.body).not.to.include.any.keys('object_id', 'object_type');
                if (cuboidPoints) {
                    expect(response.body.position).to.deep.equal(cuboidPoints);
                } else {
                    expect(response.body.position).to.have.length(3);
                }
                expect(response.statusCode).to.equal(201);
                expect(response.body.object_id).to.equal(null);
                expect(response.body.object_type).to.equal(null);
                expect(response.body.frame).to.equal(0);
                expect(response.body.end_frame).to.equal(null);
                createdIssues.push(response.body);
            });
        }

        cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID SHAPE').trigger('mouseover');
        cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID SHAPE')
            .should('have.class', 'cvat-objects-sidebar-state-active-item');
        cy.get('.cvat-issue-control').click();
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            viewSnapshot($canvas[0], shapeId).then(({ point }) => ({ canvas: $canvas[0], point }))
        )).then(({ canvas, point }) => { clickReviewPoint(canvas, point); });
        submitIssue();
        cy.get('.cvat-issue-point-control').click();
        cy.get('.cvat-canvas3d-topview canvas').then(($canvas) => (
            viewSnapshot($canvas[0], shapeId, 'top').then(({ point }) => ({ canvas: $canvas[0], point }))
        )).then(({ canvas, point }) => { clickReviewPoint(canvas, point); });
        submitIssue();

        // The right-clicked track wins over the prior shape selection.
        cy.then(() => { rightClickCuboid(trackId); });
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.then(() => { submitIssue([2, ...points.slice(1)]); });
        cy.then(() => { rightClickCuboid(shapeId); });
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.then(() => { submitIssue([-2, ...points.slice(1)]); });

        ['top', 'side', 'front'].forEach((view) => {
            cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID TRACK').trigger('mouseover');
            cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID TRACK')
                .should('have.class', 'cvat-objects-sidebar-state-active-item');
            cy.then(() => { rightClickCuboid(trackId, view); });
            cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
            cy.then(() => { submitIssue([2, ...points.slice(1)]); });
        });

        // A selected object must not provide a context menu for unrelated cloud points.
        cy.get('.cvat-canvas3d-perspective canvas').then(($canvas) => (
            viewCloudPoint($canvas[0]).then((point) => ({ canvas: $canvas[0], point }))
        )).then(({ canvas, point }) => {
            const rect = canvas.getBoundingClientRect();
            cy.wrap(canvas).trigger('contextmenu', point.clientX - rect.left, point.clientY - rect.top, {
                ...point, button: 2,
            });
        });
        cy.get('.cvat-canvas-context-menu').should('not.exist');

        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${createdIssues[3].id}`).click());
        cy.get('.cvat-canvas3d-issue-resize-handle').should('exist');
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${createdIssues[0].id}`).click());
        cy.get('.cvat-issue-dialog').should('be.visible');
    });
    it('restores the saved perspective after rotating, moving the marker and reloading', () => {
        let shapeId;
        let issueId;
        let originalRotation;
        let expected;
        let savedPosition;
        let savedView;
        cy.getCookie('csrftoken').then((cookie) => {
            const headers = { 'X-CSRFToken': cookie.value };
            cy.request({ method: 'DELETE', url: `/api/jobs/${jobId}/annotations`, headers });
            cy.request(`/api/issues?job_id=${jobId}`).then(({ body }) => {
                body.results.forEach((issue) => cy.request({
                    method: 'DELETE', url: `/api/issues/${issue.id}`, headers,
                }));
            });
            cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers,
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
                    tags: [],
                    tracks: [],
                },
            }).then(({ body: annotations }) => { shapeId = annotations.shapes[0].id; }));
        });
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review&frame=0`);
        cy.get('.cvat-canvas3d-perspective canvas').should('have.attr', 'data-frame-number', '0');
        const snapshot = () => cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            expect($canvas[0].getDrawnObjects().some(({ state }) => state.serverID === shapeId),
                'review cuboid is loaded').to.equal(true);
        }).then(($canvas) => (
            settledPerspectiveSnapshot($canvas[0], shapeId).then((state) => ({ canvas: $canvas[0], ...state }))
        ));
        snapshot().then(({ canvas, point, rotation }) => {
            originalRotation = rotation;
            rotateScene(canvas, point);
            cy.wrap(canvas).trigger('wheel', {
                ...point, eventConstructor: 'WheelEvent', deltaY: -100, deltaMode: 0,
            });
        });
        snapshot().then(({ canvas, ...state }) => {
            expected = state;
            expect(state.rotation).not.to.deep.equal(originalRotation);
            rightClickCuboid(shapeId);
            cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        });
        cy.get('#issue_description').type('Restore this view of the cuboid');
        resizeIssueRegion(0, 'top', 12, -6);
        cy.intercept('POST', '/api/issues**').as('saveReviewView');
        cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
        cy.wait('@saveReviewView').then(({ request, response }) => {
            expect(response.statusCode).to.equal(201);
            savedView = response.body.view;
            expect(savedView).to.deep.equal(request.body.view);
            savedView.position.forEach((value, index) => expect(value).to.be.closeTo(expected.position[index], 1e-5));
            expect(savedView.up).to.deep.equal(expected.up);
            expect(savedView.zoom).to.equal(expected.zoom);
            issueId = response.body.id;
            savedPosition = response.body.position;
        });
        snapshot().then(({ canvas, point }) => { rotateScene(canvas, point); });
        snapshot().then(({ rotation }) => { expect(rotation).not.to.deep.equal(expected.rotation); });
        cy.reload();
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueId}`).click());
        cy.get('.cvat-issue-restore-view').should('be.visible').click();
        snapshot().then(({ position, rotation, zoom }) => {
            position.forEach((value, index) => expect(value).to.be.closeTo(expected.position[index], 1e-5));
            rotation.forEach((value, index) => expect(value).to.be.closeTo(expected.rotation[index], 1e-5));
            expect(zoom).to.equal(expected.zoom);
        });
        cy.then(() => cy.request(`/api/issues/${issueId}`).then(({ body }) => {
            expect(body.position).to.deep.equal(savedPosition);
            expect(body.view).to.deep.equal(savedView);
        }));
        cy.intercept('PATCH', '/api/issues/*').as('moveSavedReviewView');
        cy.then(() => dragMarker(issueId, 'top', 8, -6, false, true));
        cy.wait('@moveSavedReviewView').then(({ response }) => {
            expect(response.statusCode).to.equal(200);
            expect(response.body.position).not.to.deep.equal(savedPosition);
            expect(response.body.view).to.deep.equal(savedView);
        });
    });
    it('creates precise quick issues for 3D properties, attributes and track identity', () => {
        const createdIssues = [];
        const points = [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE',
            url: `/api/jobs/${jobId}/annotations`,
            headers: { 'X-CSRFToken': cookie.value },
        }));
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => (
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    tags: [],
                    shapes: [{
                        type: 'cuboid',
                        frame: 0,
                        label_id: body.results.find((label) => label.name === 'car').id,
                        points: [-2, ...points.slice(1)],
                        attributes: [],
                        occluded: false,
                        z_order: 0,
                        rotation: 0,
                    }],
                    tracks: [{
                        frame: 0,
                        label_id: body.results.find((label) => label.name === 'car without attributes').id,
                        attributes: [],
                        shapes: [0, 2].map((frame) => ({
                            frame,
                            type: 'cuboid',
                            points: [2, ...points.slice(1)],
                            attributes: [],
                            occluded: false,
                            outside: false,
                            z_order: 0,
                            rotation: 0,
                        })),
                    }],
                },
            })
        )));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            expect($canvas[0].getDrawnObjects()).to.have.length(2);
        });
        cy.get('.cvat-canvas3d-perspective .cvat-spinner-container').should('not.exist');
        cy.intercept('POST', '/api/issues**').as('propertyIssue');

        function openMenu(objectType) {
            const text = `CUBOID ${objectType.toUpperCase()}`;
            cy.contains('.cvat-objects-sidebar-state-item', text).trigger('mouseover');
            cy.contains('.cvat-objects-sidebar-state-item', text)
                .should('have.class', 'cvat-objects-sidebar-state-active-item');
            rightClickCuboid();
            cy.get('.cvat-canvas-context-menu').should('be.visible');
        }

        function checkIssue(message, objectType) {
            cy.wait('@propertyIssue').then(({ request, response }) => {
                expect(request.body.message).to.equal(message);
                expect(response.statusCode).to.equal(201);
                expect(response.body.object_type).to.equal(null);
                expect(response.body.object_id).to.equal(null);
                expect(response.body.position).to.deep.equal([objectType === 'track' ? 2 : -2, ...points.slice(1)]);
                expect(response.body.view.position).to.have.length(3);
                createdIssues.push(response.body.id);
                cy.request(`/api/comments?issue_id=${response.body.id}`).then(({ body }) => {
                    expect(body.results[0].message).to.equal(message);
                });
            });
        }

        ['rotation', 'dimensions'].forEach((property) => {
            openMenu('shape');
            cy.contains('.cvat-context-menu-item', 'Quick issue: incorrect track identity').should('not.exist');
            cy.contains('.cvat-context-menu-item', `Quick issue: incorrect ${property}`).click();
            checkIssue(`Wrong ${property}`, 'shape');
        });

        ['visibility', 'condition'].forEach((attribute) => {
            openMenu('shape');
            cy.contains('.cvat-context-menu-item', 'Quick issue: specific attribute').trigger('mouseover');
            cy.contains('.ant-menu-submenu-popup:visible .cvat-context-menu-item', attribute)
                .should('have.text', attribute).click();
            checkIssue(`Wrong attribute: ${attribute}`, 'shape');
        });

        openMenu('track');
        cy.contains('.cvat-context-menu-item', 'Quick issue: specific attribute').should('not.exist');
        cy.contains('.cvat-context-menu-item', 'Quick issue: incorrect track identity').click();
        checkIssue('Wrong track identity', 'track');
        openMenu('track');
        cy.contains('.cvat-context-menu-item', 'Quick issue: incorrect attribute').click();
        checkIssue('Wrong attribute', 'track');

        // Presets should not crowd out the reviewer's custom recent descriptions.
        openMenu('shape');
        cy.contains('.cvat-context-menu-item', 'Open an issue ...').click();
        cy.get('#issue_description').type('Review the rear edge');
        cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
        checkIssue('Review the rear edge', 'shape');
        openMenu('shape');
        cy.contains('.cvat-context-menu-item', 'Quick issue ...').trigger('mouseover');
        cy.get('.cvat-quick-issue-from-latest-item:visible').should(($items) => {
            expect($items.text()).to.contain('Review the rear edge');
            expect($items.text()).not.to.match(/Wrong (rotation|dimensions|track identity|attribute)/);
        });
        cy.get('.cvat-canvas3d-perspective canvas').click(50, 50);
        cy.reload();
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${createdIssues[2]}`).click());
        cy.get('.cvat-issue-dialog').should('contain.text', 'Wrong attribute: visibility');
        cy.get('.cvat-issue-dialog input').type('Use partially visible for this car');
        cy.get('.cvat-issue-dialog').contains('button', 'Comment').click();
        cy.get('.cvat-issue-dialog').contains('Use partially visible for this car').should('be.visible');
        cy.get('.cvat-issue-dialog').contains('button', 'Resolve').click();
    });
    it('places issues on cuboids and cloud points in docked and expanded orthographic views', () => {
        let trackId;
        const issueIds = [];
        const trackPoints = [0, 0, 1, 0.2, -0.15, 0.4, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE',
            url: `/api/jobs/${jobId}/annotations`,
            headers: { 'X-CSRFToken': cookie.value },
        }));
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => (
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    tags: [],
                    shapes: [],
                    tracks: [{
                        frame: 0,
                        label_id: body.results[0].id,
                        attributes: [],
                        shapes: [0, 2].map((frame) => ({
                            frame,
                            type: 'cuboid',
                            points: trackPoints,
                            attributes: [],
                            occluded: false,
                            outside: false,
                            z_order: 0,
                            rotation: 0,
                        })),
                    }],
                },
            }).then(({ body: annotations }) => { trackId = annotations.tracks[0].id; })
        )));
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            expect($canvas[0].getDrawnObjects()).to.have.length(1);
        });
        cy.get('.cvat-canvas3d-perspective .cvat-spinner-container').should('not.exist');
        cy.intercept('POST', '/api/issues**').as('orthographicIssue');
        // Keep existing labels from covering the locations used for subsequent reports.
        cy.contains('[role="tab"]', 'Issues').click();
        cy.get('.cvat-objects-sidebar-issues-toolbar').then(($toolbar) => {
            if ($toolbar.find('.cvat-issues-sidebar-shown-issues').length) {
                cy.get('.cvat-issues-sidebar-shown-issues').click();
            }
        });
        cy.contains('[role="tab"]', 'Objects').click();

        ['top', 'side', 'front'].forEach((view) => {
            const pane = `.cvat-canvas3d-${view}view`;
            [false, true].forEach((expanded) => {
                let clickPoint;
                cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID TRACK').trigger('mouseover');
                cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID TRACK')
                    .should('have.class', 'cvat-objects-sidebar-state-active-item');
                if (expanded) {
                    cy.get(pane).closest('.cvat-canvas-grid-item').find('.cvat-grid-item-fullscreen-handler').click();
                }
                cy.get('body').type('n');
                cy.get(`${pane} canvas`).then(($canvas) => (
                    viewSnapshot($canvas[0], trackId, view).then(({ point }) => ({ canvas: $canvas[0], point }))
                )).then(({ canvas, point }) => {
                    clickPoint = {
                        ...point,
                        clientX: point.clientX + canvas.getBoundingClientRect().width * (expanded ? 0.12 : -0.12),
                    };
                    if (!expanded) {
                        // A drag, including one that returns to its start, must not place an issue.
                        rotateScene(canvas, clickPoint, true);
                        cy.get('.cvat-create-issue-dialog').should('not.exist');
                        cy.get('.cvat-issue-control').should('have.class', 'cvat-active-canvas-control');
                        const rect = canvas.getBoundingClientRect();
                        clickReviewPoint(canvas, { clientX: rect.left + 2, clientY: rect.top + 2 });
                        cy.get('.cvat-create-issue-dialog').should('not.exist');
                    }
                    clickReviewPoint(canvas, clickPoint);
                });
                cy.get('.cvat-create-issue-dialog').should('be.visible');
                checkSimpleIssueForm();
                cy.get(pane).then(($pane) => {
                    const bounds = $pane[0].getBoundingClientRect();
                    const gridBounds = $pane[0].closest('.cvat-canvas-grid-root').getBoundingClientRect();
                    cy.get('.cvat-create-issue-dialog').should(($dialog) => {
                        const rect = $dialog[0].getBoundingClientRect();
                        expect(rect.bottom, 'draft stays beside or above its source pane').to.be.at.most(bounds.bottom);
                        expect(rect.left, 'draft remains inside the grid').to.be.at.least(gridBounds.left);
                        expect(rect.right, 'draft remains inside the grid').to.be.at.most(gridBounds.right);
                    });
                });
                cy.get('#issue_description').type(`Check ${view} ${expanded ? 'expanded' : 'docked'} cuboid`);
                cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
                cy.wait('@orthographicIssue').then(({ response }) => {
                    expect(response.statusCode).to.equal(201);
                    expect(response.body.object_type).to.equal(null);
                    expect(response.body.object_id).to.equal(null);
                    expect(response.body.frame).to.equal(0);
                    expect(response.body.end_frame).to.equal(null);
                    expect(response.body.view.position).to.have.length(3);
                    issueIds.push(response.body.id);
                    cy.get(`${pane} canvas`).then(($canvas) => (
                        viewSnapshot($canvas[0], trackId, view, response.body.position)
                    )).then(({ point, localPoint, clipDepth }) => {
                        expect(point.clientX).to.be.closeTo(clickPoint.clientX, 0.1);
                        expect(point.clientY).to.be.closeTo(clickPoint.clientY, 0.1);
                        expect(Math.max(...localPoint.map(Math.abs)), 'pin lies on the rotated cuboid surface')
                            .to.be.closeTo(0.5, 1e-5);
                        expect(Math.abs(clipDepth), 'pin lies in the visible depth slab').to.be.at.most(1);
                    });
                });
                if (expanded) {
                    cy.get('.cvat-canvas-grid-fullscreen-item .cvat-grid-item-fullscreen-handler').click();
                }
            });

            // Cloud feedback must stay unlinked, even while the track is selected.
            cy.get(`${pane} canvas`).trigger('wheel', 12, 40, { deltaY: 500 });
            cy.get('body').type('n');
            cy.get(`${pane} canvas`).then(($canvas) => (
                viewCloudPoint($canvas[0], view).then((point) => ({ canvas: $canvas[0], point }))
            )).then(({ canvas, point }) => { clickReviewPoint(canvas, point); });
            cy.get('.cvat-create-issue-dialog').should('be.visible');
            checkSimpleIssueForm();
            cy.get('#issue_description').type(`Check ${view} cloud point`);
            cy.get('.cvat-create-issue-dialog').contains('button', 'Submit').click();
            cy.wait('@orthographicIssue').then(({ response }) => {
                expect(response.statusCode).to.equal(201);
                expect(response.body.object_id).to.equal(null);
                expect(response.body.object_type).to.equal(null);
                cy.get(`${pane} canvas`).then(($canvas) => {
                    const cloud = $canvas[0].scene.children.find((child) => child.isPoints && child.visible);
                    const vertices = cloud.geometry.attributes.position;
                    const vector = cloud.position.clone();
                    const points = new Set(Array.from({ length: vertices.count }, (_, index) => (
                        vector.fromBufferAttribute(vertices, index).applyMatrix4(cloud.matrixWorld).toArray().join(',')
                    )));
                    expect(points.has(response.body.position.join(',')), 'pin uses an actual cloud point').to.equal(true);
                    return viewSnapshot($canvas[0], trackId, view, response.body.position);
                }).then(({ clipDepth }) => {
                    expect(Math.abs(clipDepth), 'cloud point is inside the visible depth slab').to.be.at.most(1);
                });
            });
        });

        cy.request(`/api/jobs/${jobId}/annotations`).then(({ body }) => {
            expect(body.tracks[0].shapes.every((shape) => (
                shape.points.every((value, index) => value === trackPoints[index])
            )), 'issue placement does not edit the cuboid').to.equal(true);
        });
        cy.contains('[role="tab"]', 'Issues').click();
        cy.get('.cvat-issues-sidebar-hidden-issues').click();
        cy.then(() => cy.get(`.cvat-canvas3d-issue-region[data-issue-id="${issueIds[0]}"]`).should('have.length', 4));
    });

    it('highlights linked cuboids with a single translucent color without changing annotation colors', () => {
        let shapeId;
        let trackId;
        let originalColor;
        const issueIds = [];
        const points = [0, 0, 1, 0, 0, 0.3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
        cy.getCookie('csrftoken').then((cookie) => cy.request({
            method: 'DELETE', url: `/api/jobs/${jobId}/annotations`, headers: { 'X-CSRFToken': cookie.value },
        }));
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => (
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    tags: [],
                    shapes: [{
                        type: 'cuboid',
                        frame: 0,
                        label_id: body.results[0].id,
                        points: [-2, ...points.slice(1)],
                        attributes: [],
                        occluded: false,
                        z_order: 0,
                        rotation: 0,
                    }],
                    tracks: [{
                        frame: 0,
                        label_id: body.results[0].id,
                        attributes: [],
                        shapes: [0, 2].map((frame) => ({
                            frame,
                            type: 'cuboid',
                            points: [2, ...points.slice(1)],
                            attributes: [],
                            occluded: false,
                            outside: false,
                            z_order: 0,
                            rotation: 0,
                        })),
                    }],
                },
            }).then(({ body: annotations }) => {
                shapeId = annotations.shapes[0].id;
                trackId = annotations.tracks[0].id;
            })
        )));
        cy.getCookie('csrftoken').then((cookie) => {
            const headers = { 'X-CSRFToken': cookie.value };
            cy.then(() => {
                [
                    {
                        object_type: 'shape', object_id: shapeId, position: [-2, 0, 2], message: 'First cuboid issue',
                    },
                    {
                        object_type: 'shape', object_id: shapeId, position: [-2, 0, 1], message: 'Second cuboid issue',
                    },
                    {
                        object_type: 'track', object_id: trackId, position: [2, 0, 1], message: 'Resolved track issue',
                    },
                    { position: [-2, 0, 0], message: 'Unlinked point inside the same view' },
                ].forEach((issue) => cy.request({
                    method: 'POST', url: '/api/issues', headers, body: { job: jobId, frame: 0, ...issue },
                }).then(({ body }) => { issueIds.push(body.id); }));
            });
            cy.then(() => cy.request({
                method: 'PATCH', url: `/api/issues/${issueIds[2]}`, headers, body: { resolved: true },
            }));
        });
        cy.visit(`/tasks/${taskId}/jobs/${jobId}?defaultWorkspace=review`);
        cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
            expect($canvas[0].getDrawnObjects()).to.have.length(2);
        }).then(($canvas) => {
            originalColor = $canvas[0].getDrawnObjects().find(({ state }) => (
                state.serverID === shapeId && state.objectType === 'shape'
            )).cuboid.perspective.material.color.getHexString();
        });

        function checkIssueHighlight(id, objectType, color) {
            cy.get('.cvat-canvas3d-perspective canvas').should(($canvas) => {
                const { cuboid } = $canvas[0].getDrawnObjects().find(({ state }) => (
                    state.serverID === id && state.objectType === objectType
                ));
                ['perspective', 'top', 'side', 'front'].forEach((view) => {
                    const regions = cuboid[view].children.filter((child) => child.name === 'cvat-issue-region');
                    expect(regions, `${objectType} highlight in ${view}`).to.have.length(color ? 1 : 0);
                    expect(cuboid[view].material.colorWrite, 'normal fill is restored when the issue highlight clears')
                        .to.equal(!color);
                    if (color) {
                        expect(regions[0].material.uniforms.regionColor.value.getHexString()).to.equal(color);
                        expect(regions[0].material.uniforms.regionOpacity.value).to.be.within(0.2, 0.99);
                        expect(regions[0].material.fragmentShader).not.to.include('discard');
                        expect(regions[0].geometry).not.to.equal(cuboid[view].geometry);
                        expect(regions[0].getWorldPosition(cuboid[view].position.clone()).toArray())
                            .to.deep.equal(cuboid[view].getWorldPosition(cuboid[view].position.clone()).toArray());
                    }
                    if (objectType === 'shape') {
                        expect(cuboid[view].material.color.getHexString()).to.equal(originalColor);
                    }
                });
            });
        }

        cy.contains('.cvat-objects-sidebar-state-item', 'CUBOID SHAPE').trigger('mouseover');
        cy.then(() => { checkSelectedCuboid(shapeId, 'shape'); });
        cy.then(() => { checkIssueHighlight(shapeId, 'shape', 'ff0000'); });
        cy.then(() => { checkIssueHighlight(trackId, 'track', null); });
        cy.contains('[role="tab"]', 'Issues').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[0]}`).trigger('mouseover'));
        cy.then(() => { checkIssueHighlight(shapeId, 'shape', 'ffff00'); });
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[0]}`).trigger('mouseout'));
        cy.then(() => { checkIssueHighlight(shapeId, 'shape', 'ff0000'); });

        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[0]}`).click());
        cy.get('.cvat-issue-dialog').contains('button', 'Resolve').click();
        cy.then(() => { checkIssueHighlight(shapeId, 'shape', 'ff0000'); });
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[1]}`).click());
        cy.get('.cvat-issue-dialog').contains('button', 'Resolve').click();
        cy.then(() => { checkIssueHighlight(shapeId, 'shape', null); });

        // Resolved issues can be previewed, but do not leave a persistent region.
        cy.then(() => cy.get(`#cvat-hidden-issue-label-${issueIds[0]}-perspective`).trigger('mouseover'));
        cy.then(() => { checkIssueHighlight(shapeId, 'shape', 'ff0000'); });
        cy.then(() => cy.get(`#cvat-hidden-issue-label-${issueIds[0]}-perspective`).trigger('mouseout'));
        cy.then(() => { checkIssueHighlight(shapeId, 'shape', null); });
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[2]}`).trigger('mouseover'));
        cy.then(() => { checkIssueHighlight(trackId, 'track', 'ffff00'); });
        cy.get('.cvat-issues-sidebar-hidden-resolved-status').click();
        cy.then(() => { checkIssueHighlight(trackId, 'track', null); });
        cy.get('.cvat-issues-sidebar-hidden-resolved-status').click();
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[2]}`).trigger('mouseout'));
        cy.then(() => cy.get(`#cvat-objects-sidebar-issue-item-${issueIds[2]}`).click());
        cy.get('.cvat-issue-dialog').contains('button', 'Reopen').click();
        cy.then(() => { checkIssueHighlight(trackId, 'track', 'ff0000'); });
        cy.get('.cvat-issues-sidebar-shown-issues').click();
        cy.then(() => { checkIssueHighlight(trackId, 'track', null); });
        cy.get('.cvat-issues-sidebar-hidden-issues').click();
        cy.then(() => { checkIssueHighlight(trackId, 'track', 'ff0000'); });
        cy.goCheckFrameNumber(1);
        cy.then(() => { checkIssueHighlight(trackId, 'track', null); });
        cy.goCheckFrameNumber(0);
        cy.then(() => { checkIssueHighlight(trackId, 'track', 'ff0000'); });
    });
});

context('2D review with shared canvas popups', () => {
    let taskId;
    let jobId;
    before(() => {
        cy.prepareUserSession();
        const { taskSpec, dataSpec } = defaultTaskSpec({
            taskName: '2D review popup regression',
            labelName: 'car',
            attributes: [{ name: 'visibility', type: 'Text', values: 'unknown' }],
            serverFiles: ['archive.zip'],
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
    it('creates, comments on and resolves an issue using the original 2D popups', () => {
        cy.get('.cvat-issue-control').should('not.have.class', 'cvat-disabled-canvas-control').click();
        cy.get('#cvat_canvas_wrapper').click('center');
        cy.get('.cvat-issue-restore-view').should('not.exist');
        cy.get('.cvat-create-issue-dialog').within(() => {
            cy.get('#issue_description').type('Check the 2D boundary');
            cy.contains('button', 'Submit').click();
        });
        cy.get('.cvat-hidden-issue-label').should('contain.text', 'Check the 2D boundary');
        cy.resolveIssue('.cvat-hidden-issue-label', 'Checked in 2D');
        cy.get('.cvat-issue-dialog').should('not.exist');
        cy.get('.cvat-hidden-issue-resolved-indicator').should('exist');
    });

    it('keeps the original 2D quick issue choices and creation behavior', () => {
        cy.request(`/api/labels?job_id=${jobId}`).then(({ body }) => cy.getCookie('csrftoken').then((cookie) => (
            cy.request({
                method: 'PATCH',
                url: `/api/jobs/${jobId}/annotations?action=create`,
                headers: { 'X-CSRFToken': cookie.value },
                body: {
                    tags: [],
                    tracks: [],
                    shapes: [{
                        type: 'rectangle',
                        frame: 0,
                        label_id: body.results[0].id,
                        points: [100, 100, 300, 300],
                        attributes: [],
                        occluded: false,
                        z_order: 0,
                        rotation: 0,
                    }],
                },
            })
        )));
        cy.reload();
        cy.get('#cvat_canvas_shape_1').trigger('mouseover');
        cy.get('#cvat_canvas_shape_1').trigger('mousemove');
        cy.get('#cvat_canvas_shape_1').rightclick();
        cy.get('.cvat-canvas-context-menu').should('be.visible').within(() => {
            cy.contains('Quick issue: incorrect position').should('exist');
            cy.contains('Quick issue: incorrect attribute').should('exist');
            cy.contains('Quick issue: incorrect rotation').should('not.exist');
            cy.contains('Quick issue: incorrect dimensions').should('not.exist');
            cy.contains('Quick issue: incorrect track identity').should('not.exist');
            cy.contains('Quick issue: specific attribute').should('not.exist');
            cy.intercept('POST', '/api/issues**').as('original2dQuickIssue');
            cy.contains('Quick issue: incorrect attribute').click();
        });
        cy.wait('@original2dQuickIssue').then(({ request, response }) => {
            expect(response.statusCode).to.equal(201);
            expect(request.body.message).to.equal('Wrong attribute');
            expect(response.body.position).to.have.length(10);
            expect(response.body.object_id).to.equal(null);
            expect(response.body.view).to.equal(null);
        });
    });
});
