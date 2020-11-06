// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Group features', () => {
    const caseId = '15';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleShape2PointsSecond = {
        points: 'By 2 Points',
        type: 'Shape',
        switchLabel: false,
        firstX: createRectangleShape2Points.firstX + 300,
        firstY: createRectangleShape2Points.firstY,
        secondX: createRectangleShape2Points.secondX + 300,
        secondY: createRectangleShape2Points.secondY,
    };
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        switchLabel: false,
        firstX: 250,
        firstY: 600,
        secondX: 350,
        secondY: 700,
    };
    const createRectangleTrack2PointsSecond = {
        points: 'By 2 Points',
        type: 'Track',
        switchLabel: false,
        firstX: createRectangleTrack2Points.firstX + 300,
        firstY: createRectangleTrack2Points.firstY,
        secondX: createRectangleTrack2Points.secondX + 300,
        secondY: createRectangleTrack2Points.secondY,
    };

    let fillChangeAppearance = '';
    let fillGroupedShape = '';
    let fillGroupedTrack = '';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Create two shapes and two tracks.', () => {
            cy.createRectangle(createRectangleShape2Points);
            cy.createRectangle(createRectangleShape2PointsSecond);
            cy.createRectangle(createRectangleTrack2Points);
            cy.createRectangle(createRectangleTrack2PointsSecond);
        });
        it('Set option "Color by" to "Group".', () => {
            cy.changeAppearance('Group');
            cy.get('.cvat_canvas_shape').then($listCanvasShapes => {
                for (let i=0; i<$listCanvasShapes.length; i++) {
                    cy.get($listCanvasShapes[i]).should('have.css', 'fill').then($fill => {
                        // expected rgb(224, 224, 224) to equal rgb(224, 224, 224)
                        expect($fill).to.be.equal($fill);
                        fillChangeAppearance = $fill;
                    });
                }
            });
            cy.get('.cvat-objects-sidebar-state-item').then($listObjectsSidebarStateItem => {
                for (let i=0; i<$listObjectsSidebarStateItem.length; i++) {
                    cy.get($listObjectsSidebarStateItem[i]).should('have.css', 'background-color').then($bColorObjectsSidebarStateItem => {
                        // expected rgba(224, 224, 224, 0.533) to include [ 224, 224, 224, index: 4, input: 'rgb(224, 224, 224)', groups: undefined ]
                        expect($bColorObjectsSidebarStateItem).contain(fillChangeAppearance.match(/\d+, \d+, \d+/))
                    });
                }
            });
        });
        it('With group button unite two shapes. They have corresponding colors.', () => {
            cy.get('.cvat-group-control').click();
            for (let shapeToGroup of ['#cvat_canvas_shape_1', '#cvat_canvas_shape_2']) {
                cy.get(shapeToGroup).click();
            }
            cy.get('.cvat-group-control').click();
            for (let groupedShape of ['#cvat_canvas_shape_1', '#cvat_canvas_shape_2']) {
                cy.get(groupedShape).should('have.css', 'fill').then($fillGroupedShape => {
                    // expected rgb(250, 50, 83) to not equal rgb(224, 224, 224)
                    expect($fillGroupedShape).to.not.equal(fillChangeAppearance);
                    // expected rgb(250, 50, 83) to equal rgb(250, 50, 83)
                    expect($fillGroupedShape).to.be.equal($fillGroupedShape);
                    fillGroupedShape = $fillGroupedShape;
                });
            }
            for (let objectSideBarShape of ['#cvat-objects-sidebar-state-item-1', '#cvat-objects-sidebar-state-item-2']) {
                cy.get(objectSideBarShape).should('have.css', 'background-color').then($bColorobjectSideBarShape => {
                    // expected rgba(250, 50, 83, 0.533) to not include [ 224, 224, 224, index: 4, input: 'rgb(224, 224, 224)', groups: undefined ]
                    expect($bColorobjectSideBarShape).to.not.contain(fillChangeAppearance.match(/\d+, \d+, \d+/));
                    // expected rgba(250, 50, 83, 0.533) to include [ 250, 50, 83, index: 4, input: 'rgb(250, 50, 83)', groups: undefined ]
                    expect($bColorobjectSideBarShape).to.be.contain(fillGroupedShape.match(/\d+, \d+, \d+/));
                });
            }
        });
        it('With group button unite two track. They have corresponding colors.', () => {
            cy.get('.cvat-group-control').click();
            for (let trackToGroup of ['#cvat_canvas_shape_3', '#cvat_canvas_shape_4']) {
                cy.get(trackToGroup).click();
            }
            cy.get('.cvat-group-control').click();
            for (let groupedTrack of ['#cvat_canvas_shape_3', '#cvat_canvas_shape_4']) {
                cy.get(groupedTrack).should('have.css', 'fill').then($fillGroupedTrack => {
                    // expected rgb(250, 50, 83) to not equal rgb(224, 224, 224)
                    expect($fillGroupedTrack).to.not.equal(fillChangeAppearance);
                    // expected rgb(250, 50, 83) to equal rgb(250, 50, 83)
                    expect($fillGroupedTrack).to.be.equal($fillGroupedTrack);
                    fillGroupedTrack = $fillGroupedTrack;
                });
            }
            for (let objectSideBarTrack of ['#cvat-objects-sidebar-state-item-3', '#cvat-objects-sidebar-state-item-4']) {
                cy.get(objectSideBarTrack).should('have.css', 'background-color').then($bColorobjectSideBarTrack => {
                    // expected rgba(52, 209, 183, 0.533) to not include [ 224, 224, 224, index: 4, input: 'rgb(224, 224, 224)', groups: undefined ]
                    expect($bColorobjectSideBarTrack).to.not.contain(fillChangeAppearance.match(/\d+, \d+, \d+/));
                    // expected rgba(52, 209, 183, 0.533) to include [ 52, 209, 183, index: 4, input: 'rgb(52, 209, 183)', groups: undefined ]
                    expect($bColorobjectSideBarTrack).to.be.contain(fillGroupedTrack.match(/\d+, \d+, \d+/));
                });
            }
        });
    });
});
