// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// /// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Filters functionality.', () => {
    const caseId = '18';
    const labelShape = 'shape 3 points';
    const additionalAttrsLabelShape = [
        { name: 'type', values: 'shape', type: 'Text' },
        { name: 'count points', values: '3', type: 'Text' },
        { name: 'polygon', values: 'True', type: 'Checkbox' },
    ];
    const labelTrack = 'track 4 points';
    const additionalAttrsLabelTrack = [
        { name: 'type', values: 'track', type: 'Text' },
        { name: 'polygon', values: 'True', type: 'Checkbox' },
        { name: 'count points', values: '4', type: 'Text' },
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
        secondX: 750,
        secondY: 350,
        thirdX: 750,
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
    const createEllipseTrack = {
        type: 'Track',
        labelName: labelTrack,
        firstX: 250,
        firstY: 350,
        secondX: 450,
        secondY: 280,
    };

    const cvatCanvasShapeList = [];
    const cvatFiltesList = [];

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
        cy.addNewLabel({ name: labelShape }, additionalAttrsLabelShape);
        cy.addNewLabel({ name: labelTrack }, additionalAttrsLabelTrack);
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
            cy.createEllipse(createEllipseTrack);
        });

        it('Filter: shape == "polygon". Only the polygon exist.', () => {
            const textFilter = 'shape == "polygon"';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Shape',
                operator: '==',
                value: 'polygon',
                submit: true,
            });
            checkingFilterApplication([1, 4]); // #cvat_canvas_shape_1,4, #cvat-objects-sidebar-state-item-1,4
            cy.clearFilters(); // Clear filters
        });

        it('Filter: (shape == "polygon" || shape == "rectangle"). Only the rectangle and polygon exist.', () => {
            const textFilter = '(shape == "polygon" || shape == "rectangle")';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0, ruleIndex: 0, field: 'Shape', operator: '==', value: 'polygon',
            });
            cy.addFiltersRule(0);
            cy.setGroupCondition(0, 'Or');
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 1,
                field: 'Shape',
                operator: '==',
                value: 'rectangle',
                submit: true,
            });
            // #cvat_canvas_shape_1,2,3,4, #cvat-objects-sidebar-state-item-1,2,3,4
            checkingFilterApplication([1, 2, 3, 4]);
            cy.clearFilters(); // Clear filters
        });

        it('Filter: type == "shape". Only the objects with shape type exist.', () => {
            const textFilter = 'type == "shape"';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0, ruleIndex: 0, field: 'Type', operator: '==', value: 'shape', submit: true,
            });
            checkingFilterApplication([1, 3]); // #cvat_canvas_shape_1,3, #cvat-objects-sidebar-state-item-1,3
            cy.clearFilters(); // Clear filters
        });

        it('Filter: label == "track 4 points". Only the polygon exist.', () => {
            const textFilter = 'label == "track 4 points"';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: labelTrack,
                submit: true,
            });
            checkingFilterApplication([2, 4, 5]); // #cvat_canvas_shape_2,4,5, #cvat-objects-sidebar-state-item-2,4,5
            cy.clearFilters(); // Clear filters
        });

        it('Filter: Attributes count points 4. Only the objects with same attr exist.', () => {
            const textFilter = 'attr.track 4 points.count points == "4"';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Attributes',
                operator: '==',
                value: 4,
                label: labelTrack,
                labelAttr: 'count points',
                submit: true,
            });
            // #cvat_canvas_shape_2,4,5, #cvat-objects-sidebar-state-item-2,4,5
            checkingFilterApplication([2, 4, 5]);
            cy.clearFilters(); // Clear filters
        });

        it('Filter: width >= height. All objects exist.', () => {
            const textFilter = 'width >= height';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Width',
                operator: '>=',
                valueSource: 'Field',
                value: 'Height',
                submit: true,
            });
            // #cvat_canvas_shape_1,2,3,4,5, #cvat-objects-sidebar-state-item-1,2,3,4,5
            checkingFilterApplication([1, 2, 3, 4, 5]);
            cy.clearFilters(); // Clear filters
        });

        it('Filter: objectID == 4. Only the objects with same id exist (polygon track).', () => {
            const textFilter = 'objectID == 4';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0, ruleIndex: 0, field: 'ObjectID', operator: '==', value: 4, submit: true,
            });
            // #cvat_canvas_shape_4, #cvat-objects-sidebar-state-item-4
            checkingFilterApplication([4]);
            cy.clearFilters(); // Clear filters
        });

        it('Filter: ((label == "shape 3 points" && attr.track 4 points.type == "polylines") || (label == "track 4 points" && width > 60)). Only the objects polygon and rectangle exist.', () => {
            const textFilter =
                '((label == "shape 3 points" && attr.track 4 points.type == "polylines") || (label == "track 4 points" && width > 60))';
            cvatFiltesList.push(textFilter);
            cy.addFiltersGroup(0);
            cy.addFiltersGroup(0);
            cy.setFilter({
                groupIndex: 1, ruleIndex: 0, field: 'Label', operator: '==', value: labelShape,
            });
            cy.addFiltersRule(1);
            cy.setFilter({
                groupIndex: 1,
                ruleIndex: 1,
                field: 'Attributes',
                operator: '==',
                value: 'polylines',
                label: labelTrack,
                labelAttr: 'type',
            });
            cy.setFilter({
                groupIndex: 2, ruleIndex: 2, field: 'Label', operator: '==', value: labelTrack,
            });
            cy.addFiltersRule(2);
            cy.setGroupCondition(0, 'Or');
            cy.setFilter({
                groupIndex: 2, ruleIndex: 3, field: 'Width', operator: '>', value: '60', submit: true,
            });
            checkingFilterApplication([2, 4, 5]); // #cvat_canvas_shape_2,4,5, #cvat-objects-sidebar-state-item-2,4,5
            cy.clearFilters(); // Clear filters
        });

        it('Filter: ((label == "shape 3 points" || (attr.shape 3 points.type == "shape" && width > 50)) && height > 50). Only the rectangle shape exist.', () => {
            const textFilter =
                '((label == "shape 3 points" || (attr.shape 3 points.type == "shape" && width > 50)) && height > 50)';
            cvatFiltesList.push(textFilter);
            cy.addFiltersGroup(0);
            cy.setFilter({
                groupIndex: 1, ruleIndex: 0, field: 'Label', operator: '==', value: labelShape,
            });
            cy.addFiltersGroup(1);
            cy.setGroupCondition(1, 'Or');
            cy.setFilter({
                groupIndex: 2,
                ruleIndex: 1,
                field: 'Attributes',
                operator: '==',
                value: 'shape',
                label: labelShape,
                labelAttr: 'type',
            });
            cy.addFiltersRule(2);
            cy.setFilter({
                groupIndex: 2, ruleIndex: 2, field: 'Width', operator: '>', value: 50,
            });
            cy.addFiltersGroup(0);
            cy.setGroupCondition(0, 'And');
            cy.setFilter({
                groupIndex: 3, ruleIndex: 3, field: 'Height', operator: '>', value: 50, submit: true,
            });
            checkingFilterApplication([3]); // #cvat_canvas_shape_3, #cvat-objects-sidebar-state-item-3
            cy.clearFilters(); // Clear filters
        });

        it('Filter: shape == "ellipse". Only the ellipse exist.', () => {
            const textFilter = 'shape == "ellipse"';
            cvatFiltesList.push(textFilter);
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Shape',
                operator: '==',
                value: 'ellipse',
                submit: true,
            });
            checkingFilterApplication([5]); // #cvat_canvas_shape_5, #cvat-objects-sidebar-state-item-5
            cy.clearFilters(); // Clear filters
        });

        it('Verify to show all filters', () => {
            cy.checkFiltersModalOpened();
            cy.get('.cvat-recently-used-filters-wrapper').click();
            cy.get('.cvat-recently-used-filters-dropdown').should('exist').and('be.visible').within(() => {
                cvatFiltesList.forEach((filterValue) => {
                    cy.get('li').contains('[role="menuitem"]', filterValue).should('have.length', 1);
                });
            });
            cy.get('.cvat-recently-used-filters-wrapper').click();
        });

        it('Select filter: type == "shape"', () => {
            cy.selectFilterValue(new RegExp('^type == "shape"$'));
            checkingFilterApplication([1, 3]);
        });

        it('Select filter: objectID == 4', () => {
            cy.selectFilterValue(new RegExp('^objectID == 4$'));
            checkingFilterApplication([4]);
        });
    });
});
