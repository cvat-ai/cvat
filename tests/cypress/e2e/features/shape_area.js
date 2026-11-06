// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { defaultTaskSpec } from '../../support/default-specs';
import { clickCanvasImagePoint } from '../../support/utils.cy';

context('Shape area text setting', { scrollBehavior: false }, () => {
    const labelName = 'shape';
    const maskWithHoleLabel = 'mask with hole';
    const textSelector = (id) => `.cvat_canvas_text[data-client-id="${id}"]`;
    const sizeSelector = (id) => `${textSelector(id)} .cvat_canvas_text_dimensions`;
    const areaSelector = (id) => `${textSelector(id)} .cvat_canvas_text_area`;
    const polygonAndMaskAreas = [
        [4, '100.0px²'], // Triangle: 20 * 10 / 2.
        [5, '300.0px²'], // Concave L: 20 * 20 - 10 * 10.
        [6, '100.0px²'], // The triangle with its vertices in the opposite order.
        [7, '55.1px²'], // Triangle with fractional coordinates: 10.5 * 10.5 / 2.
        [8, '84.0px²'], // 10 * 10 mask with a 4 * 4 hole.
        [9, '2.0px²'], // Two disconnected pixels in a 10 * 10 bounding box.
        [10, '1.0px²'], // A single-pixel mask.
        [11, '2.0px²'], // A mask with a nonzero initial background run.
    ];
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
        taskSpec.labels.push({ name: maskWithHoleLabel, type: 'mask', attributes: [] });
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
                {
                    objectType: 'shape',
                    type: 'polygon',
                    labelName,
                    frame: 0,
                    points: [350, 350, 370, 350, 350, 360],
                },
                {
                    objectType: 'shape',
                    type: 'polygon',
                    labelName,
                    frame: 0,
                    points: [450, 350, 470, 350, 470, 360, 460, 360, 460, 370, 450, 370],
                },
                {
                    objectType: 'shape',
                    type: 'polygon',
                    labelName,
                    frame: 0,
                    points: [600, 360, 620, 350, 600, 350],
                },
                {
                    objectType: 'shape',
                    type: 'polygon',
                    labelName,
                    frame: 0,
                    points: [350, 450, 360.5, 450, 350, 460.5],
                },
                {
                    objectType: 'shape',
                    type: 'mask',
                    labelName: maskWithHoleLabel,
                    frame: 0,
                    points: [0, 33, 4, 6, 4, 6, 4, 6, 4, 33, 550, 450, 559, 459],
                },
                {
                    objectType: 'shape',
                    type: 'mask',
                    labelName,
                    frame: 0,
                    points: [0, 1, 98, 1, 600, 450, 609, 459],
                },
                {
                    objectType: 'shape',
                    type: 'mask',
                    labelName,
                    frame: 0,
                    points: [0, 1, 650, 450, 650, 450],
                },
                {
                    objectType: 'shape',
                    type: 'mask',
                    labelName,
                    frame: 0,
                    points: [1, 2, 1, 650, 500, 651, 501],
                },
                {
                    objectType: 'shape',
                    type: 'polyline',
                    labelName,
                    frame: 0,
                    points: [100, 550, 120, 550, 120, 570],
                },
            ], jobId);
        });
    });

    beforeEach(() => {
        cy.visit(`/tasks/${taskId}/jobs/${jobId}`);
        cy.get('.cvat_canvas_shape').should('have.length', 12);
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

    it('Shows polygon and mask areas without counting their bounding boxes or mask holes', () => {
        setTextContent(['ID', 'Dimensions', 'Area']);
        polygonAndMaskAreas.forEach(([id, expectedArea]) => {
            cy.get(areaSelector(id)).should('have.text', expectedArea);
            cy.get(sizeSelector(id)).should('not.exist');
        });
        cy.get(areaSelector(12)).should('not.exist');

        setTextContent(['ID', 'Dimensions']);
        cy.get('.cvat_canvas_text_area').should('not.exist');
        polygonAndMaskAreas.forEach(([id]) => {
            cy.get(textSelector(id)).should('not.contain.text', 'px²');
        });

        setTextContent(['ID', 'Area']);
        cy.changeWorkspace('Review');
        cy.reload();
        polygonAndMaskAreas.forEach(([id, expectedArea]) => {
            cy.get(areaSelector(id)).should('have.text', expectedArea);
        });
    });

    it('Updates area after editing polygon vertices and mask pixels, including undo and redo', () => {
        setTextContent(['ID', 'Label', 'Area']);
        cy.get('#cvat_canvas_shape_5').trigger('mousemove', 5, 5, { eventConstructor: 'MouseEvent' });
        cy.get('#cvat_canvas_shape_5').should('have.class', 'cvat_canvas_shape_activated');
        cy.get('.svg_select_points_point').should('have.length', 6).eq(3).trigger('mouseenter');
        cy.get('.cvat_canvas_selected_point').trigger('mousedown', {
            eventConstructor: 'MouseEvent', button: 0, altKey: true,
        });
        cy.document().trigger('mouseup', { eventConstructor: 'MouseEvent', button: 0, altKey: true });
        cy.get('#cvat_canvas_shape_5').should(($shape) => {
            expect($shape.attr('points').trim().split(/\s+/)).to.have.length(5);
        });
        cy.get(areaSelector(5)).should('have.text', '350.0px²');
        cy.get('.cvat-annotation-header-undo-button').click();
        cy.get(areaSelector(5)).should('have.text', '300.0px²');

        cy.interactAnnotationObjectMenu('#cvat-objects-sidebar-state-item-8', 'Edit');
        cy.get('.cvat-brush-tools-toolbox').should('be.visible');
        cy.get('.cvat-brush-tools-polygon-minus').click();
        [
            { x: 549, y: 449 }, { x: 554, y: 449 },
            { x: 554, y: 461 }, { x: 549, y: 461 },
        ].forEach((point) => clickCanvasImagePoint(point));
        cy.finishMaskDrawing();

        let editedMaskArea = null;
        cy.get(areaSelector(8)).should(($area) => {
            expect(parseFloat($area.text())).to.be.greaterThan(0).and.lessThan(84);
        }).invoke('text').then((text) => {
            editedMaskArea = text;
        });
        cy.get('.cvat-annotation-header-undo-button').click();
        cy.get(areaSelector(8)).should('have.text', '84.0px²');
        cy.get('.cvat-annotation-header-redo-button').click();
        cy.get(areaSelector(8)).should(($area) => {
            expect($area.text()).to.equal(editedMaskArea);
        });
        cy.saveJob();
        cy.reload();
        // Client IDs may change after saving and reloading an edited mask.
        cy.contains('.cvat_canvas_text', maskWithHoleLabel).find('.cvat_canvas_text_area').should(($area) => {
            expect($area.text()).to.equal(editedMaskArea);
        });
    });
});
