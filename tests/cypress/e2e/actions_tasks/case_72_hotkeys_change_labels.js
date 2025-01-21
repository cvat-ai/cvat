// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Hotkeys to change labels feature.', () => {
    const caseId = '72';
    const labelName = `Case ${caseId}`;
    const taskName = labelName;
    const attrName = `Attr for ${labelName}`;
    const textDefaultValue = '2';
    const imagesCount = 1;
    const imageFileName = `image_${labelName.replace(' ', '_').toLowerCase()}`;
    const width = 800;
    const height = 800;
    const posX = 10;
    const posY = 10;
    const color = 'gray';
    const archiveName = `${imageFileName}.zip`;
    const archivePath = `cypress/fixtures/${archiveName}`;
    const imagesFolder = `cypress/fixtures/${imageFileName}`;
    const directoryToArchive = imagesFolder;
    const secondLabel = `Case ${caseId} second`;
    const additionalAttrsSecondLabel = [{
        name: attrName,
        values: '0;3;1',
        type: 'Number',
        mutable: false,
    }];
    let firstLabelCurrentVal = '';
    let secondLabelCurrentVal = '';

    function testCheckingAlwaysShowObjectDetails(check) {
        cy.openSettings();
        cy.get('.cvat-settings-modal').within(() => {
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-show-text-always').within(() => {
                if (check) {
                    cy.get('[type="checkbox"]').check();
                    cy.get('[type="checkbox"]').should('be.checked');
                } else {
                    cy.get('[type="checkbox"]').uncheck();
                    cy.get('[type="checkbox"]').should('not.be.checked');
                }
            });
        });
        cy.closeSettings();
    }

    before(() => {
        cy.visit('/auth/login');
        cy.login();
        cy.imageGenerator(imagesFolder, imageFileName, width, height, color, posX, posY, labelName, imagesCount);
        cy.createZipArchive(directoryToArchive, archivePath);
        cy.createAnnotationTask(taskName, labelName, attrName, textDefaultValue, archiveName);
        cy.openTask(taskName);
        cy.addNewLabel({ name: secondLabel }, additionalAttrsSecondLabel);
        cy.openJob();
    });

    after(() => {
        cy.goToTaskList();
        cy.deleteTask(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        // Collect labels text. Since the server can return them in reverse order.
        it('Collect label values relative to hotkeys.', () => {
            cy.get('.cvat-objects-sidebar-tabs').within(() => {
                cy.contains('[role="tab"]', 'Labels').click();
            });
            cy.get('.cvat-objects-sidebar-label-item .cvat-text').then(($objectsSidebarLabelItem) => {
                firstLabelCurrentVal = $objectsSidebarLabelItem[0].innerText;
                secondLabelCurrentVal = $objectsSidebarLabelItem[1].innerText;
            });
            cy.get('.cvat-objects-sidebar-tabs').within(() => {
                cy.contains('[role="tab"]', 'Objects').click();
            });
        });

        it('Changing a label for a shape using hotkey. Check "Attribute keeping when changing label" feature.', () => {
            const createPolygonShape = {
                reDraw: false,
                type: 'Shape',
                labelName: firstLabelCurrentVal,
                pointsMap: [
                    { x: 200, y: 200 },
                    { x: 300, y: 200 },
                    { x: 300, y: 300 },
                ],
                complete: true,
                numberOfPoints: null,
            };
            // Set settings "Always show object details" to check issue 3083
            testCheckingAlwaysShowObjectDetails(true);
            cy.createPolygon(createPolygonShape);
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .should('have.text', firstLabelCurrentVal);
            cy.get('.cvat-canvas-container').click(270, 260);
            cy.get('#cvat_canvas_shape_1').should('have.class', 'cvat_canvas_shape_activated');
            cy.contains('tspan', `${firstLabelCurrentVal} 1 (manual)`).should('be.visible');

            // Check "Attribute keeping when changing label" feature
            cy.get('#cvat-objects-sidebar-state-item-1').find('.cvat-objects-sidebar-state-item-collapse').click();
            cy.get('body').type('{Ctrl}2');
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .should('have.text', secondLabelCurrentVal);
            cy.contains('tspan', `${secondLabelCurrentVal} 1 (manual)`).should('be.visible');
            // The value of the attribute of the 2nd label corresponds
            //  to the value of the attribute of the same name of the 1st label
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-object-item-number-attribute')
                .find('input')
                .should('have.attr', 'aria-valuenow', textDefaultValue);

            // Unset settings "Always show object details"
            testCheckingAlwaysShowObjectDetails();
        });

        it('Changing default label before drawing a shape.', () => {
            cy.interactControlButton('draw-rectangle');
            cy.switchLabel(firstLabelCurrentVal, 'draw-rectangle');
            cy.get('.cvat-draw-rectangle-popover').within(() => {
                cy.contains('button', 'Shape').click();
            });
            cy.get('body').type('{Ctrl}2');
            cy.contains(`Default label has been changed to "${secondLabelCurrentVal}"`).should('exist');
            cy.get('.cvat-canvas-container').click(500, 500);
            cy.get('.cvat-canvas-container').click(600, 600);
            cy.get('#cvat-objects-sidebar-state-item-2')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .should('have.text', secondLabelCurrentVal);
        });
    });
});
