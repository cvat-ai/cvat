// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Filters functionality.', () => {
    const caseId = '18';
    const labelPolygonShape = 'polygon shape';
    const additionalAttrsLabelPolygonShape = [
        { additionalAttrName: 'type', additionalValue: 'shape', typeAttribute: 'Text' },
        { additionalAttrName: 'count points', additionalValue: '3', typeAttribute: 'Text' },
        { additionalAttrName: 'polygon', additionalValue: 'True', typeAttribute: 'Checkbox' },
    ];
    const labelRectangleTrack2Points = 'rectangle track by 2 points';
    const additionalAttrsLabelRectangleTrack2Points = [
        { additionalAttrName: 'type', additionalValue: 'track', typeAttribute: 'Text' },
        { additionalAttrName: 'rectangle', additionalValue: 'True', typeAttribute: 'Checkbox' },
        { additionalAttrName: 'count points', additionalValue: '2', typeAttribute: 'Text' },
    ];
    const labelCuboidShape4Points = 'cuboid shape by 4 points';
    const additionalAttrsLabelCuboidShape4Points = [
        { additionalAttrName: 'type', additionalValue: 'shape', typeAttribute: 'Text' },
        { additionalAttrName: 'cuboid', additionalValue: 'True', typeAttribute: 'Checkbox' },
        { additionalAttrName: 'count points', additionalValue: '4', typeAttribute: 'Text' },
    ];
    const labelPolylinesShape = 'polylines shape';
    const additionalAttrsLabelPolylinesShape = [
        { additionalAttrName: 'type', additionalValue: 'shape', typeAttribute: 'Text' },
        { additionalAttrName: 'polylines', additionalValue: 'True', typeAttribute: 'Checkbox' },
        { additionalAttrName: 'count points', additionalValue: '3', typeAttribute: 'Text' },
    ];
    const labelPointsShape = 'points shape';
    const additionalAttrsLabelPointsShape = [
        { additionalAttrName: 'type', additionalValue: 'shape', typeAttribute: 'Text' },
        { additionalAttrName: 'points', additionalValue: 'True', typeAttribute: 'Checkbox' },
        { additionalAttrName: 'count points', additionalValue: '1', typeAttribute: 'Text' },
    ];
    const labelRectangleShape4Points = 'rectangle shape by 4 points';
    const additionalAttrsLabelRectangleShape4Points = [
        { additionalAttrName: 'type', additionalValue: 'shape', typeAttribute: 'Text' },
        { additionalAttrName: 'rectangle', additionalValue: 'True', typeAttribute: 'Checkbox' },
        { additionalAttrName: 'count points', additionalValue: '4', typeAttribute: 'Text' },
    ];
    const labelPolygonTrack = 'polygon track';
    const additionalAttrsLabelPolygonTrack = [
        { additionalAttrName: 'type', additionalValue: 'track', typeAttribute: 'Text' },
        { additionalAttrName: 'polygon', additionalValue: 'True', typeAttribute: 'Checkbox' },
        { additionalAttrName: 'count points', additionalValue: '4', typeAttribute: 'Text' },
    ];

    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName: labelPolygonShape,
        pointsMap: [
            { x: 200, y: 200 },
            { x: 250, y: 200 },
            { x: 250, y: 240 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName: labelRectangleTrack2Points,
        firstX: 260,
        firstY: 200,
        secondX: 360,
        secondY: 250,
    };
    const createCuboidShape4Points = {
        points: 'By 4 Points',
        type: 'Shape',
        labelName: labelCuboidShape4Points,
        firstX: 400,
        firstY: 350,
        secondX: 500,
        secondY: 320,
        thirdX: 500,
        thirdY: 450,
        fourthX: 400,
        fourthY: 450,
    };
    const createPolylinesShape = {
        type: 'Shape',
        labelName: labelPolylinesShape,
        pointsMap: [
            { x: 600, y: 200 },
            { x: 650, y: 200 },
            { x: 650, y: 250 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName: labelPointsShape,
        pointsMap: [{ x: 700, y: 200 }],
        complete: true,
        numberOfPoints: null,
    };
    const createRectangleShape4Points = {
        points: 'By 4 Points',
        type: 'Shape',
        labelName: labelRectangleShape4Points,
        firstX: 550,
        firstY: 350,
        secondX: 650,
        secondY: 350,
        thirdX: 650,
        thirdY: 450,
        fourthX: 550,
        fourthY: 450,
    };
    const createPolygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName: labelPolygonTrack,
        pointsMap: [
            { x: 700, y: 350 },
            { x: 850, y: 350 },
            { x: 850, y: 450 },
            { x: 700, y: 450 },
        ],
        numberOfPoints: 4,
    };

    let cvatCanvasShapeList = [];

    function checkingFilterApplication(ids) {
        for (let i = 0; i < cvatCanvasShapeList.length; i++) {
            if (ids.indexOf(cvatCanvasShapeList[i]) > -1) {
                cy.get(`#cvat_canvas_shape_${cvatCanvasShapeList[i]}`).should('exist');
                cy.get(`#cvat-objects-sidebar-state-item-${cvatCanvasShapeList[i]}`).should('exist');
            } else {
                cy.get(`#cvat_canvas_shape_${cvatCanvasShapeList[i]}`).should('not.exist');
                cy.get(`#cvat-objects-sidebar-state-item-${cvatCanvasShapeList[i]}`).should('not.exist');
            }
        }
    }

    before(() => {
        cy.openTask(taskName);
        cy.addNewLabel(labelPolygonShape, additionalAttrsLabelPolygonShape);
        cy.addNewLabel(labelRectangleTrack2Points, additionalAttrsLabelRectangleTrack2Points);
        cy.addNewLabel(labelCuboidShape4Points, additionalAttrsLabelCuboidShape4Points);
        cy.addNewLabel(labelPolylinesShape, additionalAttrsLabelPolylinesShape);
        cy.addNewLabel(labelPointsShape, additionalAttrsLabelPointsShape);
        cy.addNewLabel(labelRectangleShape4Points, additionalAttrsLabelRectangleShape4Points);
        cy.addNewLabel(labelPolygonTrack, additionalAttrsLabelPolygonTrack);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw several objects (different shapes, tracks, labels)', () => {
            cy.createPolygon(createPolygonShape);
            cy.createRectangle(createRectangleTrack2Points);
            cy.createCuboid(createCuboidShape4Points);
            cy.createPolyline(createPolylinesShape);
            cy.createPoint(createPointsShape);
            cy.createRectangle(createRectangleShape4Points);
            cy.createPolygon(createPolygonTrack);
            cy.get('.cvat_canvas_shape').then(($cvatCanvasShapeList) => {
                for (let i = 0; i < $cvatCanvasShapeList.length; i++) {
                    cvatCanvasShapeList.push(Number($cvatCanvasShapeList[i].id.match(/\d+$/)));
                }
            });
        });

        it('Filter: shape=="cuboid". Only the cuboid exist.', () => {
            cy.writeFilterValue(false, 'shape=="cuboid"'); // #cvat_canvas_shape_3, #cvat-objects-sidebar-state-item-3
            checkingFilterApplication([3]);
        });
        it('Filter: shape=="polygon" | shape=="cuboid". Only the cuboid and polygon exist.', () => {
            cy.writeFilterValue(true, 'shape=="polygon" | shape=="cuboid"'); // #cvat_canvas_shape_1,3,7, #cvat-objects-sidebar-state-item-1,3,7
            checkingFilterApplication([1, 3, 7]);
        });
        it('Filter: type=="shape". Only the objects with shape type exist.', () => {
            cy.writeFilterValue(true, 'type=="shape"'); // #cvat_canvas_shape_1,3-6, #cvat-objects-sidebar-state-item-1,3-6
            checkingFilterApplication([1, 3, 4, 5, 6]);
        });
        it('Filter: label=="polygon shape". Only the polygon exist.', () => {
            cy.writeFilterValue(true, `label=="${labelPolygonShape}"`); // #cvat_canvas_shape_1, #cvat-objects-sidebar-state-item-1
            checkingFilterApplication([1]);
        });
        it('Filter: attr["count points"] == "4". Only the objects with same attr exist.', () => {
            cy.writeFilterValue(true, 'attr["count points"] == "4"'); // #cvat_canvas_shape_3,6,7, #cvat-objects-sidebar-state-item-3,6,7
            checkingFilterApplication([3, 6, 7]);
        });
        it('Filter: width >= height. All objects except polyline exist.', () => {
            cy.writeFilterValue(true, 'width >= height'); // #cvat_canvas_shape_1-3,5-7, #cvat-objects-sidebar-state-item-1-3,5-7
            checkingFilterApplication([1, 2, 3, 5, 6, 7]);
        });
        it('Filter: clientID == 7. Only the objects with same id exist (polygon track).', () => {
            cy.writeFilterValue(true, 'clientID == 7'); // #cvat_canvas_shape_7, #cvat-objects-sidebar-state-item-7
            checkingFilterApplication([7]);
        });
        it('Filter: (label=="polylines shape" & attr["polylines"]==true) | (label=="rectangle shape by 4 points" & width > 50). Only the objects polyline and rectangle exist.', () => {
            cy.writeFilterValue(
                true,
                '(label=="polylines shape" & attr["polylines"]==true) | (label=="rectangle shape by 4 points" & width > 50)',
            ); // #cvat_canvas_shape_4,6, #cvat-objects-sidebar-state-item-4,6
            checkingFilterApplication([4, 6]);
        });
        it('Filter: (( label==["points shape"]) | (attr["type"]=="shape" & width > 50)) & (height > 50 & (clientID == serverID))). All objects not exist.', () => {
            cy.writeFilterValue(
                true,
                '(( label==["points shape"]) | (attr["type"]=="shape" & width > 50)) & (height > 50 & (clientID == serverID)))',
            );
            checkingFilterApplication([]);
        });
    });
});
