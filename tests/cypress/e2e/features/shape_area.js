// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';

context('Shape area text setting', { scrollBehavior: false }, () => {
    const labelName = 'shape';
    const textSelector = (id) => `.cvat_canvas_text[data-client-id="${id}"]`;
    const sizeSelector = (id) => `${textSelector(id)} .cvat_canvas_text_dimensions`;
    const areaSelector = (id) => `${textSelector(id)} .cvat_canvas_text_area`;
    let taskId = null;
    let jobId = null;
    let initialSettings = null;

    function setTextContent(items) {
        cy.openSettings();
        cy.contains('.ant-tabs-tab', 'Workspace').click();
        cy.get('.cvat-workspace-settings-show-text-always input').check();
        cy.get('.cvat-workspace-settings-text-content').then(($select) => {
            cy.wrap($select.find('.ant-select-selection-item-remove')).each(($remove) => {
                cy.wrap($remove).click();
            });
        });
        cy.get('.cvat-workspace-settings-text-content').click();
        items.forEach((item) => {
            cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden')
                .find(`.ant-select-item-option[title="${item}"]`).click();
        });
        cy.closeSettings();
    }

    before(() => {
        cy.visit('/auth/login');
        cy.window().then((win) => {
            initialSettings = win.localStorage.getItem('clientSettings');
        });
        cy.headlessLogin();
        const { taskSpec, dataSpec, extras } = defaultTaskSpec({
            taskName: 'Shape area text setting', labelName, serverFiles: [],
        });
        cy.readFile('mounted_file_share/images/image_1.jpg', 'base64').then((image) => {
            dataSpec.client_files = [new File([
                Cypress.Blob.base64StringToBlob(image, 'image/jpeg'),
            ], 'image.jpg', { type: 'image/jpeg' })];
            return cy.headlessCreateTask(taskSpec, dataSpec, extras);
        }).then(({ taskId: tid, jobIds: [jid] }) => {
            taskId = tid;
            jobId = jid;
            cy.headlessCreateObjects([
                {
                    objectType: 'shape',
                    type: 'rectangle',
                    labelName,
                    frame: 0,
                    points: [100, 100, 290, 330],
                    rotation: 30,
                },
                {
                    objectType: 'shape',
                    type: 'ellipse',
                    labelName,
                    frame: 0,
                    points: [450, 200, 500, 160],
                    rotation: 45,
                },
                {
                    objectType: 'shape',
                    type: 'rectangle',
                    labelName,
                    frame: 0,
                    points: [100, 400, 110.25, 420.75],
                },
            ], jobId);
        });
    });

    beforeEach(() => {
        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.get('.cvat_canvas_shape').should('have.length', 3);
        cy.get('.cvat-spinner').should('not.exist');
    });

    after(() => {
        if (taskId !== null) cy.headlessDeleteTask(taskId);
        cy.window().then((win) => {
            if (initialSettings === null) {
                win.localStorage.removeItem('clientSettings');
            } else {
                win.localStorage.setItem('clientSettings', initialSettings);
            }
        });
    });

    it('Toggles area independently of dimensions and preserves the setting in Review after reloading', () => {
        setTextContent(['ID', 'Dimensions', 'Area']);
        cy.get(sizeSelector(1)).should('have.text', '190.0x230.0px = 43700.0px² 30.0°');
        cy.get(sizeSelector(2)).should('have.text', '100.0x80.0px = 6283.2px² 45.0°');
        // Calculate area from the original coordinates, before rounding the displayed dimensions.
        cy.get(sizeSelector(3)).should('have.text', '10.3x20.8px = 212.7px²');

        setTextContent(['ID', 'Dimensions']);
        cy.get(sizeSelector(1)).should('have.text', '190.0x230.0px 30.0°');
        cy.get(sizeSelector(2)).should('have.text', '100.0x80.0px 45.0°');
        cy.get('.cvat_canvas_text_area').should('not.exist');

        setTextContent(['ID', 'Area']);
        cy.get(areaSelector(1)).should('have.text', '43700.0px²');
        cy.get(areaSelector(2)).should('have.text', '6283.2px²');
        cy.get('.cvat_canvas_text_dimensions').should('not.exist');

        setTextContent(['ID']);
        cy.get('.cvat_canvas_text_area, .cvat_canvas_text_dimensions').should('not.exist');

        setTextContent(['ID', 'Dimensions', 'Area']);
        cy.changeWorkspace('Review');
        cy.get(areaSelector(1)).should('contain.text', '= 43700.0px²');
        cy.get(areaSelector(2)).should('contain.text', '= 6283.2px²');
        cy.reload();
        cy.get(areaSelector(1)).should('contain.text', '= 43700.0px²');
        cy.get(areaSelector(2)).should('contain.text', '= 6283.2px²');

        setTextContent(['ID', 'Dimensions']);
        cy.reload();
        cy.get(sizeSelector(1)).should('have.text', '190.0x230.0px 30.0°');
        cy.get('.cvat_canvas_text_area').should('not.exist');
    });

    it('Respects the area setting while drawing and excludes cuboids', () => {
        [false, true].forEach((withArea) => {
            setTextContent(withArea ? ['Dimensions', 'Area'] : ['Dimensions']);
            ['rectangle', 'ellipse', 'cuboid'].forEach((type) => {
                cy.interactControlButton(`draw-${type}`);
                cy.get(`.cvat-draw-${type}-popover`).within(() => {
                    if (type === 'rectangle') cy.contains('2 Points').click();
                    if (type === 'cuboid') cy.contains('From rectangle').click();
                    cy.contains('button', 'Shape').click();
                });
                cy.get('.cvat-canvas-container').click(200, 350);
                cy.get('.cvat-canvas-container').trigger('mousemove', 350, 450);
                cy.get('.cvat_canvas_text:not([data-client-id])')
                    .should(withArea && type !== 'cuboid' ? 'contain.text' : 'not.contain.text', 'px²');
                cy.get('body').type('{esc}');
                cy.get('.cvat_canvas_text:not([data-client-id])').should('not.exist');
            });
        });
    });
});
