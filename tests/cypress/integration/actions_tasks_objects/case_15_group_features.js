// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Group features', () => {
    const caseId = '15';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: createRectangleShape2Points.firstX + 300,
        firstY: createRectangleShape2Points.firstY,
        secondX: createRectangleShape2Points.secondX + 300,
        secondY: createRectangleShape2Points.secondY,
    };
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName: labelName,
        firstX: 250,
        firstY: 600,
        secondX: 350,
        secondY: 700,
    };
    const createRectangleTrack2PointsSecond = {
        points: 'By 2 Points',
        type: 'Track',
        labelName: labelName,
        firstX: createRectangleTrack2Points.firstX + 300,
        firstY: createRectangleTrack2Points.firstY,
        secondX: createRectangleTrack2Points.secondX + 300,
        secondY: createRectangleTrack2Points.secondY,
    };

    let defaultGroupColorRgb = '';
    let defaultGroupColorHex = '';
    let shapesGroupColor = '';
    let tracksGroupColor = '';
    const yellowHex = 'fcbe03';
    const yellowRgb = '252, 190, 3';

    const shapeArray = ['#cvat_canvas_shape_1', '#cvat_canvas_shape_2'];
    const shapeSidebarItemArray = ['#cvat-objects-sidebar-state-item-1', '#cvat-objects-sidebar-state-item-2'];
    const trackArray = ['#cvat_canvas_shape_3', '#cvat_canvas_shape_4'];
    const trackSidebarItemArray = ['#cvat-objects-sidebar-state-item-3', '#cvat-objects-sidebar-state-item-4'];

    before(() => {
        cy.clearLocalStorageSnapshot();
        cy.openTaskJob(taskName);
    });

    beforeEach(() => {
        cy.restoreLocalStorage();
    });

    afterEach(() => {
        cy.saveLocalStorage();
    });

    function testGroupObjects(objectsArray, cancelGrouping) {
        cy.get('.cvat-group-control').click();
        for (const shapeToGroup of objectsArray) {
            cy.get(shapeToGroup).click().should('have.class', 'cvat_canvas_shape_grouping');
        }
        cancelGrouping ? cy.get('body').type('{Esc}') : cy.get('.cvat-group-control').click();
    }

    function testUnGroupObjects() {
        cy.get('.cvat-group-control').click();
        for (const shapeToGroup of shapeArray) {
            cy.get(shapeToGroup).click().should('have.class', 'cvat_canvas_shape_grouping');
        }
        cy.get('body').type('{Shift}g');
    }

    function changeGroupColor(object, color) {
        cy.get(object).within(() => {
            cy.get('[aria-label="more"]').click();
        });
        cy.wait(300);
        cy.get('.ant-dropdown')
            .not('.ant-dropdown-hidden')
            .within(() => {
                cy.contains('Change group color').click();
            });
        cy.changeColorViaBadge(color);
    }

    function testShapesFillEquality(equal) {
        for (const groupedShape of shapeArray) {
            cy.get(groupedShape)
                .should('have.css', 'fill')
                .then(($shapesGroupColor) => {
                    if (equal) {
                        expect($shapesGroupColor).to.be.equal(defaultGroupColorRgb);
                    } else {
                        expect($shapesGroupColor).to.not.equal(defaultGroupColorRgb);
                        shapesGroupColor = $shapesGroupColor;
                    }
                });
        }
    }

    function testSidebarItemsBackgroundColorEquality() {
        for (const objectSideBarShape of shapeSidebarItemArray) {
            cy.get(objectSideBarShape)
                .should('have.css', 'background-color')
                .then(($bColorobjectSideBarShape) => {
                    // expected rgba(250, 50, 83, 0.533) to not include [ 224, 224, 224, index: 4, input: 'rgb(224, 224, 224)', groups: undefined ]
                    expect($bColorobjectSideBarShape).to.not.contain(defaultGroupColorRgb.match(/\d+, \d+, \d+/));
                    // expected rgba(250, 50, 83, 0.533) to include [ 250, 50, 83, index: 4, input: 'rgb(250, 50, 83)', groups: undefined ]
                    expect($bColorobjectSideBarShape).to.be.contain(shapesGroupColor.match(/\d+, \d+, \d+/));
                });
        }
    }

    describe(`Testing case "${caseId}"`, () => {
        it('Create two shapes and two tracks.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape2PointsSecond);
            cy.createRectangle(createRectangleTrack2Points);
            cy.createRectangle(createRectangleTrack2PointsSecond);
        });

        it('Set option "Color by" to "Group".', () => {
            cy.changeAppearance('Group');
            cy.get('.cvat_canvas_shape').then(($listCanvasShapes) => {
                for (let i = 0; i < $listCanvasShapes.length; i++) {
                    cy.get($listCanvasShapes[i])
                        .should('have.css', 'fill')
                        .then(($fill) => {
                            defaultGroupColorRgb = $fill;
                        });
                }
            });
            cy.get('.cvat-objects-sidebar-state-item').then(($listObjectsSidebarStateItem) => {
                for (let i = 0; i < $listObjectsSidebarStateItem.length; i++) {
                    cy.get($listObjectsSidebarStateItem[i])
                        .should('have.css', 'background-color')
                        .then(($bColorObjectsSidebarStateItem) => {
                            // expected rgba(224, 224, 224, 0.533) to include [ 224, 224, 224, index: 4, input: 'rgb(224, 224, 224)', groups: undefined ]
                            expect($bColorObjectsSidebarStateItem).contain(defaultGroupColorRgb.match(/\d+, \d+, \d+/));
                        });
                }
            });
        });

        it('With group button unite two shapes. They have corresponding colors.', () => {
            testGroupObjects(shapeArray, true); // Reset grouping
            testShapesFillEquality(true);
            testGroupObjects(shapeArray); // Group
            testShapesFillEquality(false);
            testSidebarItemsBackgroundColorEquality();
            testUnGroupObjects(); // Ungroup
            testShapesFillEquality(true);
            // Start grouping. Cancel grouping via click to the same shape.
            cy.get('.cvat-group-control').click();
            cy.get(shapeArray[0])
                .click()
                .should('have.class', 'cvat_canvas_shape_grouping')
                .click()
                .should('not.have.class', 'cvat_canvas_shape_grouping');
            cy.get('body').type('{Esc}'); // Cancel grouping
        });

        it('With group button unite two track. They have corresponding colors.', () => {
            testGroupObjects(trackArray);
            for (const groupedTrack of trackArray) {
                cy.get(groupedTrack)
                    .should('have.css', 'fill')
                    .then(($tracksGroupColor) => {
                        // expected rgb(250, 50, 83) to not equal rgb(224, 224, 224)
                        expect($tracksGroupColor).to.not.equal(defaultGroupColorRgb);
                        tracksGroupColor = $tracksGroupColor;
                    });
            }
            for (const objectSideBarTrack of trackSidebarItemArray) {
                cy.get(objectSideBarTrack)
                    .should('have.css', 'background-color')
                    .then(($bColorobjectSideBarTrack) => {
                        // expected rgba(52, 209, 183, 0.533) to not include [ 224, 224, 224, index: 4, input: 'rgb(224, 224, 224)', groups: undefined ]
                        expect($bColorobjectSideBarTrack).to.not.contain(defaultGroupColorRgb.match(/\d+, \d+, \d+/));
                        // expected rgba(52, 209, 183, 0.533) to include [ 52, 209, 183, index: 4, input: 'rgb(52, 209, 183)', groups: undefined ]
                        expect($bColorobjectSideBarTrack).to.be.contain(tracksGroupColor.match(/\d+, \d+, \d+/));
                    });
            }
        });
    });

    describe(`Testing case "${caseId}". Group color feature.`, () => {
        before(() => {
            cy.removeAnnotations();
            cy.saveJob('PUT');
            cy.reload();
            cy.closeModalUnsupportedPlatform();
            cy.get('.cvat-canvas-container').should('exist');
        });

        it('Create 3 objects.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape2PointsSecond);
            cy.createRectangle(createRectangleTrack2Points);
        });

        it('Set option "Color by" to "Group". With group button unite two shapes. They have corresponding colors.', () => {
            cy.changeAppearance('Group');
            cy.get('.cvat_canvas_shape').then(($listCanvasShapes) => {
                for (let i = 0; i < $listCanvasShapes.length; i++) {
                    cy.get($listCanvasShapes[i])
                        .should('have.attr', 'fill')
                        .then(($fill) => {
                            defaultGroupColorHex = $fill;
                        });
                }
            });
            testGroupObjects(shapeArray);
        });

        it('Change group color.', () => {
            changeGroupColor('#cvat-objects-sidebar-state-item-1', yellowHex);
        });

        it('For these objects, the fill and stroke parameters took the corresponding color values.', () => {
            for (const groupedShape of shapeArray) {
                cy.get(groupedShape).should('have.attr', 'stroke', `#${yellowHex}`);
            }
            for (const groupedSidebarItemShape of shapeSidebarItemArray) {
                cy.get(groupedSidebarItemShape)
                    .should('have.attr', 'style')
                    .and('contain', `background-color: rgba(${yellowRgb}`);
            }
        });

        it('Try to change color group for third onject. Color not changed.', () => {
            changeGroupColor('#cvat-objects-sidebar-state-item-3', yellowHex);
            cy.get('#cvat_canvas_shape_3').should('have.attr', 'stroke', defaultGroupColorHex);
            cy.get('#cvat-objects-sidebar-state-item-3')
                .should('have.css', 'background-color')
                .and('contain', defaultGroupColorRgb.match(/\d+, \d+, \d+/));
        });
    });
});
