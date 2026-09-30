// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Selection in the virtualized sidebar', { scrollBehavior: false }, () => {
    const labelName = 'polygon';
    const objectCount = 40;
    const holder = '.cvat-objects-sidebar-virtual-list .rc-virtual-list-holder';
    const platformModifier = Cypress.platform === 'darwin' ? { metaKey: true } : { ctrlKey: true };
    let taskId = null;

    const objects = Array.from({ length: objectCount }, (_, index) => {
        const x = 60 + (index % 8) * 80;
        const y = 60 + Math.floor(index / 8) * 80;
        return {
            objectType: 'shape',
            type: 'polygon',
            labelName,
            frame: 0,
            zOrder: index < objectCount / 2 ? 0 : 1,
            points: [x, y, x + 20, y, x + 40, y, x + 40, y + 20,
                x + 40, y + 40, x + 20, y + 40, x, y + 40, x, y + 20],
        };
    });

    function assertSelection(count) {
        cy.get('.cvat_canvas_selected_objects_label_title').should('have.text', `SELECTION (${count})`);
    }

    function startSimplification() {
        cy.get(`#cvat_canvas_shape_${objectCount}`).trigger('mousemove', { force: true });
        cy.get(`#cvat_canvas_shape_${objectCount}`)
            .should('have.class', 'cvat_canvas_shape_activated').rightclick({ force: true });
        cy.get('.cvat-canvas-context-menu .cvat-object-item-menu-button').click();
        cy.contains('.cvat-object-item-menu:visible button', 'Simplify').click();
        cy.get('.cvat-approx-poly-threshold-wrapper').should('be.visible');
        cy.get('#cvat_canvas_content').trigger('mousedown', { button: 0, force: true });
        cy.get('.cvat-canvas-context-menu').should('not.exist');
        cy.get('.cvat-approx-poly-threshold-wrapper [role="slider"]')
            .type('{home}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}');
        cy.get('.cvat-approx-poly-threshold-wrapper [role="slider"]').should('have.attr', 'aria-valuenow', '5');
        cy.get(`#cvat_canvas_shape_${objectCount}`).should(($shape) => {
            expect($shape.attr('points').trim().split(/\s+/)).to.have.length.lessThan(8);
        });
    }

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin();
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName: 'Virtualized sidebar selection regression',
            labelName,
            serverFiles: ['images/image_1.jpg'],
        });
        cy.headlessCreateTask(taskSpec, dataSpec, extras).then(({ taskId: tid, jobIds: [jobId] }) => {
            taskId = tid;
            cy.headlessCreateObjects(objects, jobId);
            cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
            cy.get('.cvat_canvas_shape').should('have.length', objectCount);
        });
    });

    after(() => {
        if (taskId !== null) cy.headlessDeleteTask(taskId);
    });

    beforeEach(() => {
        cy.get('body').type('{esc}', { force: true });
        cy.sidebarItemSortBy('ID - ascent');
        cy.get(holder).scrollTo('top', { duration: 0, ensureScrollable: false });
    });

    it('Selects a range across unmounted rows while keeping the list virtualized', () => {
        cy.getObjectSidebarItem(1).click({ ...platformModifier, force: true });
        cy.getObjectSidebarItem(objectCount).then(($item) => {
            cy.get(`${holder} #cvat-objects-sidebar-state-item-1`).should('not.exist');
            cy.wrap($item).click({ shiftKey: true, force: true });
        });
        assertSelection(objectCount);
        cy.get(`${holder} .cvat-objects-sidebar-state-item`).should('have.length.lessThan', objectCount);
        cy.getObjectSidebarItem(1).should('have.class', 'cvat-objects-sidebar-state-item-multi-selected');
        cy.getObjectSidebarItem(objectCount).should('have.class', 'cvat-objects-sidebar-state-item-multi-selected');
        assertSelection(objectCount);
    });

    it('Selects complete layers and limits Shift ranges to their own layer', () => {
        cy.sidebarItemSortBy('Layer');
        cy.get(holder).scrollTo('top', { duration: 0, ensureScrollable: false });
        cy.get('.cvat-objects-sidebar-z-layer[data-z-order="0"] .cvat-objects-sidebar-z-layer-mark')
            .click({ ...platformModifier, force: true });
        assertSelection(objectCount / 2);
        cy.get('.cvat-objects-sidebar-z-layer[data-z-order="0"] .cvat-objects-sidebar-z-layer-collapse-button')
            .click({ force: true });
        assertSelection(objectCount / 2);
        cy.getObjectSidebarItem(objectCount).find('.cvat-objects-sidebar-state-item-object-type-text')
            .click({ shiftKey: true, force: true });
        assertSelection(objectCount / 2 + 1);
        cy.getObjectSidebarItem(objectCount / 2 + 1).find('.cvat-objects-sidebar-state-item-object-type-text')
            .click({ shiftKey: true, force: true });
        assertSelection(objectCount);
        cy.get(`${holder} .cvat-objects-sidebar-state-item`).should('have.length.lessThan', objectCount);
    });

    it('Still drags an object between layers without selection modifiers', () => {
        cy.sidebarItemSortBy('Layer');
        cy.get(holder).scrollTo('top', { duration: 0, ensureScrollable: false });
        const targetLayer = '.cvat-objects-sidebar-z-layer[data-z-order="0"]';
        cy.get(targetLayer).then(($layer) => {
            if ($layer.hasClass('cvat-objects-sidebar-z-layer-virtual-header-expanded')) {
                cy.wrap($layer).find('.cvat-objects-sidebar-z-layer-collapse-button').click({ force: true });
            }
        });
        const sourceId = objectCount / 2 + 1;
        cy.getObjectSidebarItem(sourceId).find('.cvat-objects-sidebar-state-item-object-type-text').then(($source) => {
            const sourceBox = $source[0].getBoundingClientRect();
            cy.get(`${targetLayer} .cvat-objects-sidebar-z-layer-mark`).then(($target) => {
                const targetBox = $target[0].getBoundingClientRect();
                const pointer = {
                    eventConstructor: 'PointerEvent',
                    pointerId: 1,
                    pointerType: 'mouse',
                    isPrimary: true,
                    button: 0,
                    buttons: 1,
                    clientX: sourceBox.left + sourceBox.width / 2,
                    clientY: sourceBox.top + sourceBox.height / 2,
                    force: true,
                };
                cy.wrap($source).trigger('pointerdown', pointer);
                cy.document().trigger('pointermove', { ...pointer, clientX: pointer.clientX + 10 });
                const destination = {
                    ...pointer,
                    clientX: targetBox.left + targetBox.width / 2,
                    clientY: targetBox.top + targetBox.height / 2,
                };
                cy.document().trigger('pointermove', destination);
                cy.get('.cvat-objects-sidebar-z-layer-active').should('exist');
                cy.document().trigger('pointerup', { ...destination, buttons: 0 });
            });
        });
        cy.get(`#cvat_canvas_shape_${sourceId}`).should('have.attr', 'data-z-order', '0');
        cy.get('.cvat_canvas_selected_objects_label_title').should('not.exist');
    });

    it('Starts simplification for an off-screen row and keeps Apply and Cancel working during scroll', () => {
        cy.get(`${holder} #cvat-objects-sidebar-state-item-${objectCount}`).should('not.exist');
        startSimplification();
        cy.get(holder).scrollTo('bottom', { duration: 0, ensureScrollable: false });
        cy.get(holder).scrollTo('top', { duration: 0, ensureScrollable: false });
        cy.get(`${holder} #cvat-objects-sidebar-state-item-${objectCount}`).should('not.exist');
        cy.get('.cvat-approx-poly-threshold-wrapper .anticon-close').click();
        cy.get('.cvat-approx-poly-threshold-wrapper').should('not.exist');
        cy.get(`#cvat_canvas_shape_${objectCount}`).should(($shape) => {
            expect($shape.attr('points').trim().split(/\s+/)).to.have.length(8);
        });

        startSimplification();
        cy.get(holder).scrollTo('bottom', { duration: 0, ensureScrollable: false });
        cy.get(holder).scrollTo('top', { duration: 0, ensureScrollable: false });
        cy.get('.cvat-approx-poly-threshold-wrapper .anticon-check').click();
        cy.get('.cvat-approx-poly-threshold-wrapper').should('not.exist');
        cy.get('.cvat-annotation-header-undo-button').click();
        cy.get(`#cvat_canvas_shape_${objectCount}`).should(($shape) => {
            expect($shape.attr('points').trim().split(/\s+/)).to.have.length(8);
        });
    });
});
