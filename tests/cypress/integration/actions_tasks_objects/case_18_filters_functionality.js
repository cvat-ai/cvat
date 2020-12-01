// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Filters functionality.', () => {
    const caseId = '18';
    const labelShape = 'shape 3 points';
    const additionalAttrsLabelShape = [
        { additionalAttrName: 'type', additionalValue: 'shape', typeAttribute: 'Text' },
        { additionalAttrName: 'count points', additionalValue: '3', typeAttribute: 'Text' },
        { additionalAttrName: 'polygon', additionalValue: 'True', typeAttribute: 'Checkbox' },
    ];
    const labelTrack = 'track 4 points';
    const additionalAttrsLabelTrack = [
        { additionalAttrName: 'type', additionalValue: 'track', typeAttribute: 'Text' },
        { additionalAttrName: 'polygon', additionalValue: 'True', typeAttribute: 'Checkbox' },
        { additionalAttrName: 'count points', additionalValue: '4', typeAttribute: 'Text' },
    ];

    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName: labelShape,
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
        labelName: labelTrack,
        firstX: 260,
        firstY: 200,
        secondX: 360,
        secondY: 250,
    };
    const createRectangleShape4Points = {
        points: 'By 4 Points',
        type: 'Shape',
        labelName: labelShape,
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
        labelName: labelTrack,
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
        cy.addNewLabel(labelShape, additionalAttrsLabelShape);
        cy.addNewLabel(labelTrack, additionalAttrsLabelTrack);
        cy.openJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Draw several objects (different shapes, tracks, labels)', () => {
            cy.createPolygon(createPolygonShape);
            cy.createRectangle(createRectangleTrack2Points);
            cy.createRectangle(createRectangleShape4Points);
            cy.createPolygon(createPolygonTrack);
            cy.get('.cvat_canvas_shape').then(($cvatCanvasShapeList) => {
                for (let i = 0; i < $cvatCanvasShapeList.length; i++) {
                    cvatCanvasShapeList.push(Number($cvatCanvasShapeList[i].id.match(/\d+$/)));
                }
            });
        });

        it('Filter: shape=="polygon". Only the polygon exist.', () => {
            cy.writeFilterValue(false, 'shape=="polygon"'); // #cvat_canvas_shape_1,4, #cvat-objects-sidebar-state-item-1,4
            checkingFilterApplication([1, 4]);
        });
        it('Filter: shape=="polygon" | shape=="rectangle". Only the rectangle and polygon exist.', () => {
            cy.writeFilterValue(true, 'shape=="polygon" | shape=="rectangle"'); // #cvat_canvas_shape_1,2,3,4, #cvat-objects-sidebar-state-item-1,2,3,4
            checkingFilterApplication([1, 2, 3, 4]);
        });
        it('Filter: type=="shape". Only the objects with shape type exist.', () => {
            cy.writeFilterValue(true, 'type=="shape"'); // #cvat_canvas_shape_1,3, #cvat-objects-sidebar-state-item-1,3
            checkingFilterApplication([1, 3]);
        });
        it('Filter: label=="track 4 points". Only the polygon exist.', () => {
            cy.writeFilterValue(true, `label=="${labelTrack}"`); // #cvat_canvas_shape_2,4, #cvat-objects-sidebar-state-item-2,4
            checkingFilterApplication([2, 4]);
        });
        it('Filter: attr["count points"] == "4". Only the objects with same attr exist.', () => {
            cy.writeFilterValue(true, 'attr["count points"] == "4"'); // #cvat_canvas_shape_2,4, #cvat-objects-sidebar-state-item-2,4
            checkingFilterApplication([2, 4]);
        });
        it('Filter: width >= height. All objects exist.', () => {
            cy.writeFilterValue(true, 'width >= height'); // #cvat_canvas_shape_1,2,3,4, #cvat-objects-sidebar-state-item-1,2,3,4
            checkingFilterApplication([1, 2, 3, 4]);
        });
        it('Filter: clientID == 4. Only the objects with same id exist (polygon track).', () => {
            cy.writeFilterValue(true, 'clientID == 4'); // #cvat_canvas_shape_7, #cvat-objects-sidebar-state-item-4
            checkingFilterApplication([4]);
        });
        it('Filter: (label=="shape 3 points" & attr["polylines"]==true) | (label=="track 4 points" & width > 60). Only the objects polygon and rectangle exist.', () => {
            cy.writeFilterValue(
                true,
                '(label=="shape 3 points" & attr["polylines"]==true) | (label=="track 4 points" & width > 60)',
            ); // #cvat_canvas_shape_2,4, #cvat-objects-sidebar-state-item-2,4
            checkingFilterApplication([2, 4]);
        });
        it('Filter: (( label==["shape 3 points"]) | (attr["type"]=="shape" & width > 50)) & (height > 50 & (clientID == serverID))). All objects not exist.', () => {
            cy.writeFilterValue(
                true,
                '(( label==["points shape"]) | (attr["type"]=="shape" & width > 50)) & (height > 50 & (clientID == serverID)))',
            );
            checkingFilterApplication([]);
        });
    });
});
