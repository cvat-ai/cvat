/* eslint-disable no-undef */
/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

import {taskName, labelName} from '../../support/const'

context('Actions on polylines', () => {

    const caseId = '11'
    const newLabelName = `New label for case ${caseId}`
    const createPolylinesShape = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            {x: 200, y: 200},
            {x: 250, y: 200},
            {x: 250, y: 250},
            ],
        complete: true,
        numberOfPoints: null
    }
    const createPolylinesTrack = {
        type: 'Track',
        switchLabel: false,
        pointsMap: [
            {x: 300, y: 200},
            {x: 350, y: 200},
            {x: 350, y: 350},
            ],
        complete: true,
        numberOfPoints: null
    }
    const createPolylinesShapePoints = {
        type: 'Shape',
        switchLabel: false,
        pointsMap: [
            {x: 400, y: 200},
            {x: 450, y: 200},
            {x: 450, y: 250},
            {x: 400, y: 350},
            {x: 380, y: 330},
            ],
        numberOfPoints: 5
    }
    const createPolylinesTrackPoints = {
        type: 'Track',
        switchLabel: false,
        pointsMap: [
            {x: 500, y: 200},
            {x: 550, y: 200},
            {x: 550, y: 250},
            {x: 500, y: 350},
            {x: 480, y: 330},
            ],
        numberOfPoints: 5
    }
    const createPolylinesShapeSwitchLabel = {
        type: 'Shape',
        switchLabel: true,
        labelName: newLabelName,
        pointsMap: [
            {x: 600, y: 200},
            {x: 650, y: 200},
            {x: 650, y: 250},
            ],
        complete: true,
        numberOfPoints: null
    }
    const createPolylinesTrackSwitchLabel = {
        type: 'Track',
        switchLabel: true,
        labelName: newLabelName,
        pointsMap: [
            {x: 700, y: 200},
            {x: 750, y: 200},
            {x: 750, y: 250},
            ],
        complete: true,
        numberOfPoints: null
    }

    before(() => {
        cy.openTask(taskName)
    })

    describe(`Testing case "${caseId}"`, () => {
        it('Add new label', () => {
            cy.contains('button', 'Add label').click()
            cy.get('[placeholder="Label name"]').type(newLabelName)
            cy.contains('button', 'Done').click()
        })
        it('Open a job', () => {
            cy.openJob()
        })
        it('Draw a polylines shape, track', () => {
            cy.createPolyline(createPolylinesShape)
            cy.get('#cvat_canvas_shape_1')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-1')
            .should('contain', '1').and('contain', 'POLYLINE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createPolyline(createPolylinesTrack)
            cy.get('#cvat_canvas_shape_2')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-2')
            .should('contain', '2').and('contain', 'POLYLINE TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a polylines shape, track with use parameter "number of points"', () => {
            cy.createPolyline(createPolylinesShapePoints)
            cy.get('#cvat_canvas_shape_3')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-3')
            .should('contain', '3').and('contain', 'POLYLINE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
            cy.createPolyline(createPolylinesTrackPoints)
            cy.get('#cvat_canvas_shape_4')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-4')
            .should('contain', '4').and('contain', 'POLYLINE TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', labelName)
            })
        })
        it('Draw a polylines shape, track with second label', () => {
            cy.createPolyline(createPolylinesShapeSwitchLabel)
            cy.get('#cvat_canvas_shape_5')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-5')
            .should('contain', '5').and('contain', 'POLYLINE SHAPE').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })
            cy.createPolyline(createPolylinesTrackSwitchLabel)
            cy.get('#cvat_canvas_shape_6')
            .should('exist').and('be.visible')
            cy.get('#cvat-objects-sidebar-state-item-6')
            .should('contain', '6').and('contain', 'POLYLINE TRACK').within(() => {
                cy.get('.ant-select-selection-selected-value')
                .should('contain', newLabelName)
            })
        })
    })
})
