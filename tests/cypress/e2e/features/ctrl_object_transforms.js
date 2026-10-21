// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Object transforms while holding Ctrl', { scrollBehavior: false }, () => {
    const labelName = 'rectangle';
    const shapeSelector = '#cvat_canvas_shape_1';
    const objects = [[100, 100, 300, 300], [200, 200, 400, 400]].map((points) => ({
        objectType: 'shape', type: 'rectangle', labelName, frame: 0, points,
    }));
    objects.push({
        objectType: 'shape', type: 'points', labelName, frame: 0, points: [500, 150, 550, 200],
    });
    let taskId = null;
    let jobId = null;

    function holdCtrl() {
        cy.get('body').trigger('keydown', {
            key: 'Control', code: 'ControlLeft', keyCode: 17, ctrlKey: true,
        });
    }

    function dragControl(selector, dx, dy) {
        cy.get(selector).should('be.visible').then(([$control]) => {
            const box = $control.getBoundingClientRect();
            const start = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
            cy.get(selector).trigger('mousedown', {
                ...start, eventConstructor: 'MouseEvent', button: 0, buttons: 1, ctrlKey: true,
            });
            const end = { clientX: start.clientX + dx, clientY: start.clientY + dy };
            cy.get('#cvat_canvas_wrapper').trigger('mousemove', {
                ...end, eventConstructor: 'MouseEvent', buttons: 1, ctrlKey: true,
            });
            cy.document().trigger('mouseup', {
                ...end, eventConstructor: 'MouseEvent', button: 0, ctrlKey: true,
            });
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName: 'Ctrl object transforms regression', labelName, serverFiles: ['images/image_1.jpg'],
        });
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId: tid, jobIds: [jid] }) => {
            taskId = tid;
            jobId = jid;
        });
    });

    beforeEach(() => {
        cy.getCookie('csrftoken').then(({ value }) => {
            cy.request({
                method: 'DELETE',
                url: `/api/jobs/${jobId}/annotations`,
                headers: { 'X-CSRFToken': value },
            });
        });
        cy.headlessCreateObjects(objects, jobId);
        cy.visit(`/tasks/${taskId}/jobs/${jobId}`, {
            onBeforeLoad(win) {
                // Exercise Ctrl-based multiselection even when the test runner is on macOS.
                Object.defineProperty(win.navigator, 'platform', { configurable: true, value: 'Win32' });
                Object.defineProperty(win.navigator, 'userAgentData', {
                    configurable: true, value: { platform: 'Windows' },
                });
            },
        });
        cy.get('.cvat_canvas_shape').should('have.length', 3);
        cy.get('.cvat-spinner').should('not.exist');
        cy.get('#cvat-objects-sidebar-state-item-1').trigger('mouseover');
        cy.get(shapeSelector).should('have.class', 'cvat_canvas_shape_activated');
        holdCtrl();
        cy.get(shapeSelector).should('have.class', 'cvat_canvas_shape_activated');
    });

    afterEach(() => {
        cy.get('body').trigger('keyup', {
            key: 'Control', code: 'ControlLeft', keyCode: 17, ctrlKey: false,
        });
        cy.clickSaveAnnotationView();
        cy.get('.cvat-annotation-header-save-button')
            .should('not.have.class', 'cvat-annotation-disabled-header-button');
    });

    after(() => {
        if (taskId !== null) cy.headlessDeleteTask(taskId);
    });

    it('Resizes the focused rectangle with Ctrl without changing the selection', () => {
        cy.get(shapeSelector).invoke('attr', 'width').then((width) => {
            dragControl('.svg_select_points_rb', 40, 30);
            cy.get(shapeSelector).should(($shape) => {
                expect(+$shape.attr('width')).to.be.greaterThan(+width);
            });
        });
        cy.get(shapeSelector).should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.cvat_canvas_selected_objects_box').should('not.exist');
    });

    it('Rotates the focused rectangle with Ctrl without changing the selection', () => {
        dragControl('.svg_select_points_rot', 60, 40);
        cy.get(shapeSelector).should(([$shape]) => {
            expect(Math.abs($shape.instance.transform().rotation)).to.be.greaterThan(1);
        });
        cy.get(shapeSelector).should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.cvat_canvas_selected_objects_box').should('not.exist');
    });

    it('Still toggles multiselection when Ctrl-clicking an object body', () => {
        cy.get(shapeSelector).click(20, 20, { ctrlKey: true });
        cy.get('.cvat_canvas_selected_objects_label_title').should('have.text', 'SELECTION (1)');
        cy.get('.cvat_canvas_selected_objects_box').click(25, 25, { ctrlKey: true });
        cy.get('.cvat_canvas_selected_objects_box').should('not.exist');
        cy.get('#cvat_canvas_shape_3').find('circle').first().click({ ctrlKey: true });
        cy.get('#cvat-objects-sidebar-state-item-3')
            .should('have.class', 'cvat-objects-sidebar-state-item-multi-selected');
    });
});
