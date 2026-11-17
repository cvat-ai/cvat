// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Object selection shortcut', () => {
    const cursor = '.cvat-cursor-control';
    const select = '.cvat-select-control';
    const active = 'cvat-active-canvas-control';
    let taskId;

    before(() => {
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName: 'Object selection shortcut',
            labelName: 'object',
        });
        cy.visit('/auth/login');
        cy.login();
        cy.readFile('mounted_file_share/images/image_1.jpg', null).then((image) => {
            cy.window().then(({ File }) => {
                dataSpec.client_files = [new File([image], 'image.jpg', { type: 'image/jpeg' })];
                return cy.headlessCreateTask(taskSpec, dataSpec, extras);
            }).then(({ taskId: id, jobIds: [jobId] }) => {
                taskId = id;
                cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
                cy.get('.cvat-canvas-container').should('be.visible');
            });
        });
    });

    after(() => {
        if (taskId !== undefined) cy.headlessDeleteTask(taskId);
    });

    it('toggles selection on each press and shares the toolbar mode', () => {
        cy.get(cursor).should('have.class', active);
        cy.realPress(['Shift', 'S']);
        cy.get(select).should('have.class', active);

        // Holding the shortcut should not immediately toggle the tool back.
        cy.get('body').trigger('keydown', {
            eventConstructor: 'KeyboardEvent',
            key: 'S',
            keyCode: 83,
            which: 83,
            shiftKey: true,
            repeat: true,
        });
        cy.get(select).should('have.class', active);

        cy.realPress(['Shift', 'S']);
        cy.get(cursor).should('have.class', active);
        cy.get(select).click();
        cy.get(select).should('have.class', active);
        cy.realPress(['Shift', 'S']);
        cy.get(cursor).should('have.class', active);
    });
});
