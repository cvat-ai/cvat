// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Context images for 2D tasks.', () => {
    const caseId = '90';
    const labelName = `Case ${caseId}`;
    const taskName = `New annotation task for ${labelName}`;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = 'color';
    const pathToArchive = `../../${__dirname}/assets/case_90/case_90_context_image.zip`;
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };

    function previewRotate(directionRotation, expectedDeg) {
        if (directionRotation === 'right') {
            cy.get('[data-icon="rotate-right"]').click();
        } else {
            cy.get('[data-icon="rotate-left"]').click();
        }
        cy.get('.ant-image-preview-img').should('have.attr', 'style').and('contain', `rotate(${expectedDeg}deg)`);
    }

    function previewScaleWheel(zoom, expectedScaleValue) {
        cy.get('.ant-image-preview-img')
            .trigger('wheel', { deltaY: zoom })
            .should('have.attr', 'style')
            .and('contain', `scale3d(${expectedScaleValue})`);
    }

    function previewScaleButton(zoom, expectedScaleValue) {
        cy.get(`[data-icon="zoom-${zoom}"]`).click();
        cy.get('.ant-image-preview-img').should('have.attr', 'style').and('contain', `scale3d(${expectedScaleValue})`);
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, pathToArchive);
        cy.openTaskJob(taskName);
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Check a context image.', () => {
            cy.get('.cvat-context-image').should('exist').and('be.visible');
            cy.get('.cvat-player-next-button').click();
            cy.get('.cvat-context-image').should('exist').and('be.visible'); // Check a context image on the second frame
            cy.get('.cvat-player-previous-button').click();
            cy.get('.cvat-context-image-switcher').click(); // Hide a context image
            cy.get('.cvat-context-image').should('not.exist');
            cy.get('.cvat-context-image-switcher').click(); // Unhide
            cy.get('.cvat-context-image').should('exist').and('be.visible');
        });

        it('Preview a context image. Rotate.', () => {
            let degRight = 0;
            let degLeft = 360;
            cy.contains('Preview').click();
            cy.get('.ant-image-preview-mask').should('exist');
            for (let numberSpins = 0; numberSpins < 4; numberSpins++) {
                degRight += 90;
                previewRotate('right', String(degRight));
            }
            for (let numberSpins = 0; numberSpins < 4; numberSpins++) {
                degLeft -= 90;
                previewRotate('left', String(degLeft));
            }
        });

        it('Preview a context image. Scale.', () => {
            previewScaleWheel(-1, '2, 2, 1');
            previewScaleWheel(1, '1, 1, 1');
            previewScaleButton('in', '2, 2, 1');
            previewScaleButton('out', '1, 1, 1');
        });

        it('Preview a context image. Move.', () => {
            cy.get('.ant-image-preview-img-wrapper')
                .should('have.attr', 'style')
                .then((translate3d) => {
                    cy.get('.ant-image-preview-img').trigger('mousedown', { button: 0 });
                    cy.get('.ant-image-preview-moving').should('exist');
                    cy.get('.ant-image-preview-wrap').trigger('mousemove', 300, 300);
                    cy.get('.ant-image-preview-img-wrapper').should('have.attr', 'style').and('not.equal', translate3d);
                    cy.get('.ant-image-preview-img').trigger('mouseup');
                    cy.get('.ant-image-preview-moving').should('not.exist');
                    cy.get('.ant-image-preview-img-wrapper').should('have.attr', 'style').and('equal', translate3d);
                });
        });

        it('Preview a context image. Cancel preview.', () => {
            cy.get('.ant-image-preview-wrap').type('{Esc}');
            cy.get('.ant-image-preview-wrap').should('have.attr', 'style').and('contain', 'display: none');
        });

        it('Checking issue "Context image disappears after undo/redo".', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.contains('.cvat-annotation-header-button', 'Undo').click();
            cy.get('.cvat-context-image').should('have.attr', 'src');
            cy.get('#cvat_canvas_shape_1').should('not.exist');
            cy.contains('.cvat-annotation-header-button', 'Redo').click();
            cy.get('.cvat-context-image').should('have.attr', 'src');
            cy.get('#cvat_canvas_shape_1').should('exist');
        });
    });
});
