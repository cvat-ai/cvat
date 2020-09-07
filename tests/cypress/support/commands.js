/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

require('cypress-file-upload')
require('../plugins/imageGenerator/imageGeneratorCommand')
require('../plugins/createZipArchive/createZipArchiveCommand')

Cypress.Commands.add('login', (username=Cypress.env('user'), password=Cypress.env('password')) => {
    cy.get('[placeholder="Username"]').type(username)
    cy.get('[placeholder="Password"]').type(password)
    cy.get('[type="submit"]').click()
})

Cypress.Commands.add('logout', (username=Cypress.env('user')) => {
    cy.get('.cvat-right-header')
    .find('.cvat-header-menu-dropdown')
    .should('have.text', username)
    .trigger('mouseover', {which: 1})
    cy.get('.anticon-logout')
    .click()
})

Cypress.Commands.add('createAnnotationTask', (taksName='New annotation task',
                                              labelName='Some label',
                                              attrName='Some attr name',
                                              textDefaultValue='Some default value for type Text',
                                              image='image.png',
                                              multiJobs=false,
                                              segmentSize=1,
                                              multiAttr=false,
                                              additionalAttrName,
                                              typeAttribute,
                                              additionalValue) => {
    cy.get('#cvat-create-task-button').click()
    cy.url().should('include', '/tasks/create')
    cy.get('[id="name"]').type(taksName)
    cy.get('.cvat-constructor-viewer-new-item').click()
    cy.get('[placeholder="Label name"]').type(labelName)
    cy.get('.cvat-new-attribute-button').click()
    cy.get('[placeholder="Name"]').type(attrName)
    cy.get('div[title="Select"]').click()
    cy.get('li').contains('Text').click()
    cy.get('[placeholder="Default value"]').type(textDefaultValue)
    if (multiAttr) {
        cy.updateAttributes(additionalAttrName, typeAttribute, additionalValue)
    }
    cy.contains('button', 'Done').click()
    cy.get('input[type="file"]').attachFile(image, { subjectType: 'drag-n-drop' })
    if (multiJobs) {
        cy.contains('Advanced configuration').click()
        cy.get('#segmentSize')
        .type(segmentSize)
    }
    cy.contains('button', 'Submit').click()
    cy.contains('The task has been created')
    cy.get('[value="tasks"]').click()
    cy.url().should('include', '/tasks?page=')
})

Cypress.Commands.add('openTask', (taskName) => {
    cy.contains('strong', taskName)
    .parents('.cvat-tasks-list-item')
    .contains('a', 'Open')
    .click()
})

Cypress.Commands.add('openJob', (jobNumber=0) => {
    cy.get('.ant-table-tbody')
    .find('tr')
    .eq(jobNumber)
    .contains('a', 'Job #')
    .click()
    cy.url().should('include', '/jobs')
})

Cypress.Commands.add('openTaskJob', (taskName, jobNumber=0) => {
    cy.openTask(taskName)
    cy.openJob(jobNumber)
})

Cypress.Commands.add('createShape', (firstX, firstY, lastX, lastY) => {
    cy.get('.cvat-draw-rectangle-control').click()
    cy.get('.cvat-draw-shape-popover-content')
    .find('button')
    .contains('Shape')
    .click({force: true})
    cy.get('.cvat-canvas-container')
    .click(firstX, firstY)
    cy.get('.cvat-canvas-container')
    .click(lastX, lastY)
})

Cypress.Commands.add('createTrack', (firstX, firstY, lastX, lastY) => {
    cy.get('.cvat-draw-rectangle-control').click()
    cy.get('.cvat-draw-shape-popover-content')
    .find('button')
    .contains('Track')
    .click({force: true})
    cy.get('.cvat-canvas-container')
    .click(firstX, firstY)
    cy.get('.cvat-canvas-container')
    .click(lastX, lastY)
})

Cypress.Commands.add('createPoint', (posX, posY, type='Shape') => {
    cy.get('.cvat-draw-points-control').click()
    cy.get('.cvat-draw-shape-popover-content')
    .find('button')
    .contains(type)
    .click({force: true})
    cy.get('.cvat-canvas-container')
    .click(posX, posY)
    .trigger('keydown', {key: 'n'})
    .trigger('keyup', {key: 'n'})
})

Cypress.Commands.add('changeAppearance', (colorBy) => {
    cy.get('.cvat-objects-appearance-content').within(() => {
        cy.get('[type="radio"]')
        .check(colorBy, {force: true})
    })
})

Cypress.Commands.add('shapeGrouping', (firstX, firstY, lastX, lastY) => {
    cy.get('.cvat-canvas-container')
    .trigger('keydown', {key: 'g'})
    .trigger('keyup', {key: 'g'})
    .trigger('mousedown', firstX, firstY, {which: 1})
    .trigger('mousemove', lastX, lastY)
    .trigger('mouseup', lastX, lastY)
    .trigger('keydown', {key: 'g'})
    .trigger('keyup', {key: 'g'})
})

Cypress.Commands.add('createPolygon', ( mode,
                                        pointsMap,
                                        complete=true,
                                        reDraw=false) => {
    if (!reDraw) {
        cy.get('.cvat-draw-polygon-control').click()
        cy.contains('Draw new polygon')
        .parents('.cvat-draw-shape-popover-content')
        .within(() => {
            cy.get('button')
            .contains(mode)
            .click({force: true})
        })
    }
    pointsMap.forEach(element => {
        cy.get('.cvat-canvas-container')
        .click(element.x, element.y)
    })
    if (complete) {
        cy.get('.cvat-canvas-container')
        .trigger('keydown', {key: 'n'})
        .trigger('keyup', {key: 'n'})
    }
})

Cypress.Commands.add('openSettings', () => {
    cy.get('.cvat-right-header')
    .find('.cvat-header-menu-dropdown')
    .trigger('mouseover', {which: 1})
    cy.get('.anticon-setting')
    .click()
})

Cypress.Commands.add('closeSettings', () => {
    cy.get('.ant-modal-content')
    .should('contain', 'Settings')
    .within(() => {
        cy.contains('button', 'Close').click()
    })
})

Cypress.Commands.add('changeAnnotationMode', (mode) => {
    cy.get('.cvat-workspace-selector')
    .click()
    cy.get('.ant-select-dropdown-menu-item')
    .contains(mode)
    .click()
    cy.get('.cvat-workspace-selector')
    .should('contain.text', mode)
})

Cypress.Commands.add('createCuboid', (mode, firstX, firstY, lastX, lastY) => {
    cy.get('.cvat-draw-cuboid-control').click()
    cy.contains('Draw new cuboid')
    .parents('.cvat-draw-shape-popover-content')
    .within(() => {
        cy.get('button')
        .contains(mode)
        .click({force: true})
    })
    cy.get('.cvat-canvas-container')
    .click(firstX, firstY)
    cy.get('.cvat-canvas-container')
    .click(lastX, lastY)
})

Cypress.Commands.add('updateAttributes', (additionalAttrName, typeAttribute, additionalValue) => {
    cy.contains('button', 'Add an attribute').click()
    cy.get('[placeholder="Name"]').first().type(additionalAttrName)
    cy.get('div[title="Select"]').first().click()
    cy.get('.ant-select-dropdown').last().contains(typeAttribute).click()
    cy.get('[placeholder="Default value"]').first().type(additionalValue)
})
