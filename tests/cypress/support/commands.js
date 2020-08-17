/*
 * Copyright (C) 2020 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/// <reference types="cypress" />

require('cypress-file-upload')
require('../plugins/imageGenerator/imageGeneratorCommand')
require('../plugins/createZipArchive/createZipArchiveCommand')

Cypress.Commands.add('login', (username='admin', password='12qwaszx') => {
    cy.get('[placeholder="Username"]').type(username)
    cy.get('[placeholder="Password"]').type(password)
    cy.get('[type="submit"]').click()
})

Cypress.Commands.add('createAnnotationTask', (taksName='New annotation task',
                                              labelName='Some label',
                                              attrName='Some attr name',
                                              textDefaultValue='Some default value for type Text',
                                              image='image.png') => {
    cy.contains('button', 'Create new task').click()
    cy.url().should('include', '/tasks/create')
    cy.get('[id="name"]').type(taksName)
    cy.contains('button', 'Add label').click()
    cy.get('[placeholder="Label name"]').type(labelName)
    cy.contains('button', 'Add an attribute').click()
    cy.get('[placeholder="Name"]').type(attrName)
    cy.get('div[title="Select"]').click()
    cy.get('li').contains('Text').click()
    cy.get('[placeholder="Default value"]').type(textDefaultValue)
    cy.contains('button', 'Done').click()
    cy.get('input[type="file"]').attachFile(image, { subjectType: 'drag-n-drop' });
    cy.contains('button', 'Submit').click()
    cy.contains('The task has been created', {timeout: '8000'})
    cy.get('button[value="tasks"]').click()
    cy.url().should('include', '/tasks?page=')
})

Cypress.Commands.add('openTask', (taskName) => {
    cy.contains('strong', taskName)
    .parents('.cvat-tasks-list-item')
    .contains('a', 'Open')
    .click()
})

Cypress.Commands.add('openJob', () => {
    cy.contains('a', 'Job #').click()
    cy.url().should('include', '/jobs')
})

Cypress.Commands.add('openTaskJob', (taskName) => {
    cy.openTask(taskName)
    cy.openJob()
})

Cypress.Commands.add('createShape', (ferstX, ferstY, lastX, lastY) => {
    cy.get('.cvat-draw-rectangle-control').click()
    cy.get('.cvat-draw-shape-popover-content')
    .find('button')
    .contains('Shape')
    .click({force: true})
    cy.get('.cvat-canvas-container')
    .click(ferstX, ferstY)
    cy.get('.cvat-canvas-container')
    .click(lastX, lastY)
})
