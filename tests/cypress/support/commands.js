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

Cypress.Commands.add('userRegistration', (firstName, lastName, userName, emailAddr, password) => {
    cy.get('#firstName').type(firstName)
    cy.get('#lastName').type(lastName)
    cy.get('#username').type(userName)
    cy.get('#email').type(emailAddr)
    cy.get('#password1').type(password)
    cy.get('#password2').type(password)
    cy.get('.register-form-button').click()
})

Cypress.Commands.add('createAnnotationTask', (taksName='New annotation task',
                                              labelName='Some label',
                                              attrName='Some attr name',
                                              textDefaultValue='Some default value for type Text',
                                              image='image.png',
                                              multiAttrParams,
                                              advancedConfigurationParams
                                              ) => {
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
    if (multiAttrParams) {
        cy.updateAttributes(multiAttrParams)
    }
    cy.contains('button', 'Done').click()
    cy.get('input[type="file"]').attachFile(image, { subjectType: 'drag-n-drop' })
    if (advancedConfigurationParams) {
        cy.advancedConfiguration(advancedConfigurationParams)
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

Cypress.Commands.add('createRectangle', (createRectangleParams) => {
    cy.get('.cvat-draw-rectangle-control').click()
    if (createRectangleParams.switchLabel) {
        cy.switchLabel(createRectangleParams.labelName)
    }
    cy.get('.cvat-draw-shape-popover-content')
    .contains(createRectangleParams.points)
    .click()
    cy.get('.cvat-draw-shape-popover-content')
    .find('button')
    .contains(createRectangleParams.type)
    .click({force: true})
    cy.get('.cvat-canvas-container')
    .click(createRectangleParams.firstX, createRectangleParams.firstY)
    cy.get('.cvat-canvas-container')
    .click(createRectangleParams.secondX, createRectangleParams.secondY)
    if (createRectangleParams.points === 'By 4 Points') {
        cy.get('.cvat-canvas-container')
        .click(createRectangleParams.thirdX, createRectangleParams.thirdY)
        cy.get('.cvat-canvas-container')
        .click(createRectangleParams.fourthX, createRectangleParams.fourthY)
    }
})

Cypress.Commands.add('switchLabel', (labelName) => {
    cy.get('.cvat-draw-shape-popover-content')
    .find('.ant-select-selection-selected-value')
    .click()
    cy.get('.ant-select-dropdown-menu')
    .contains(labelName)
    .click()
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

Cypress.Commands.add('createCuboid', (createCuboidParams) => {
    cy.get('.cvat-draw-cuboid-control').click()
    if (createCuboidParams.switchLabel) {
        cy.switchLabel(createCuboidParams.labelName)
    }
    cy.get('.cvat-draw-shape-popover-content')
    .contains(createCuboidParams.points)
    .click()
    cy.contains('Draw new cuboid')
    .parents('.cvat-draw-shape-popover-content')
    .within(() => {
        cy.get('button')
        .contains(createCuboidParams.type)
        .click({force: true})
    })
    cy.get('.cvat-canvas-container')
    .click(createCuboidParams.firstX, createCuboidParams.firstY)
    cy.get('.cvat-canvas-container')
    .click(createCuboidParams.secondX, createCuboidParams.secondY)
    if (createCuboidParams.points === 'By 4 Points') {
        cy.get('.cvat-canvas-container')
        .click(createCuboidParams.thirdX, createCuboidParams.thirdY)
        cy.get('.cvat-canvas-container')
        .click(createCuboidParams.fourthX, createCuboidParams.fourthY)
    }
})

Cypress.Commands.add('updateAttributes', (multiAttrParams) => {
    cy.contains('button', 'Add an attribute').click()
    cy.get('[placeholder="Name"]').first().type(multiAttrParams.additionalAttrName)
    cy.get('div[title="Select"]').first().click()
    cy.get('.ant-select-dropdown').last().contains(multiAttrParams.typeAttribute).click()
    cy.get('[placeholder="Default value"]').first().type(multiAttrParams.additionalValue)
})

Cypress.Commands.add('createPolyline', (mode,
                                        pointsMap) => {
    cy.get('.cvat-draw-polyline-control').click()
    cy.contains('Draw new polyline')
    .parents('.cvat-draw-shape-popover-content')
    .within(() => {
        cy.get('button')
        .contains(mode)
        .click({force: true})
    })
    pointsMap.forEach(element => {
        cy.get('.cvat-canvas-container')
        .click(element.x, element.y)
    })
    cy.get('.cvat-canvas-container')
    .trigger('keydown', {key: 'n'})
    .trigger('keyup', {key: 'n'})
})

Cypress.Commands.add('getTaskID', (taskName) => {
    cy.contains('strong', taskName)
    .parents('.cvat-tasks-list-item').within(() => {
        cy.get('span').invoke('text')
        .then((text)=>{
            return String(text.match(/^#\d+\:/g)).replace(/[^\d]/g, '')
       })
    })
})

Cypress.Commands.add('deleteTask', (taskName, taskID) => {
    cy.contains('strong', taskName)
    .parents('.cvat-tasks-list-item')
    .find('.cvat-menu-icon')
    .trigger('mouseover')
    cy.get('.cvat-actions-menu')
    .contains('Delete')
    .click()
    cy.get('.ant-modal-content')
    .should('contain', `The task ${taskID} will be deleted`).within(() => {
        cy.contains('button', 'Delete')
        .click()
    })
})

Cypress.Commands.add('advancedConfiguration', (advancedConfigurationParams) => {
    cy.contains('Advanced configuration').click()
    if (advancedConfigurationParams.multiJobs) {
        cy.get('#segmentSize')
        .type(advancedConfigurationParams.segmentSize)
    }
    if (advancedConfigurationParams.sssFrame) {
        cy.get('#startFrame').type(advancedConfigurationParams.startFrame)
        cy.get('#stopFrame').type(advancedConfigurationParams.stopFrame)
        cy.get('#frameStep').type(advancedConfigurationParams.frameStep)
    }
})
