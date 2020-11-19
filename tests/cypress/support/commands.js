// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

require('cypress-file-upload');
require('../plugins/imageGenerator/imageGeneratorCommand');
require('../plugins/createZipArchive/createZipArchiveCommand');

let selectedValueGlobal = '';

Cypress.Commands.add('login', (username = Cypress.env('user'), password = Cypress.env('password')) => {
    cy.get('[placeholder="Username"]').type(username);
    cy.get('[placeholder="Password"]').type(password);
    cy.get('[type="submit"]').click();
});

Cypress.Commands.add('logout', (username = Cypress.env('user')) => {
    cy.get('.cvat-right-header')
        .find('.cvat-header-menu-dropdown')
        .should('have.text', username)
        .trigger('mouseover', { which: 1 });
    cy.get('.anticon-logout').click();
});

Cypress.Commands.add('userRegistration', (firstName, lastName, userName, emailAddr, password) => {
    cy.get('#firstName').type(firstName);
    cy.get('#lastName').type(lastName);
    cy.get('#username').type(userName);
    cy.get('#email').type(emailAddr);
    cy.get('#password1').type(password);
    cy.get('#password2').type(password);
    cy.get('.register-form-button').click();
});

Cypress.Commands.add(
    'createAnnotationTask',
    (
        taksName = 'New annotation task',
        labelName = 'Some label',
        attrName = 'Some attr name',
        textDefaultValue = 'Some default value for type Text',
        image = 'image.png',
        multiAttrParams,
        advancedConfigurationParams,
    ) => {
        cy.get('#cvat-create-task-button').click({ force: true });
        cy.url().should('include', '/tasks/create');
        cy.get('[id="name"]').type(taksName);
        cy.get('.cvat-constructor-viewer-new-item').click();
        cy.get('[placeholder="Label name"]').type(labelName);
        cy.get('.cvat-new-attribute-button').click();
        cy.get('[placeholder="Name"]').type(attrName);
        cy.get('div[title="Select"]').click();
        cy.get('li').contains('Text').click();
        cy.get('[placeholder="Default value"]').type(textDefaultValue);
        if (multiAttrParams) {
            cy.updateAttributes(multiAttrParams);
        }
        cy.contains('button', 'Done').click();
        cy.get('input[type="file"]').attachFile(image, { subjectType: 'drag-n-drop' });
        if (advancedConfigurationParams) {
            cy.advancedConfiguration(advancedConfigurationParams);
        }
        cy.contains('button', 'Submit').click();
        cy.contains('The task has been created');
        cy.get('[value="tasks"]').click();
        cy.url().should('include', '/tasks?page=');
    },
);

Cypress.Commands.add('openTask', (taskName) => {
    cy.contains('strong', taskName).parents('.cvat-tasks-list-item').contains('a', 'Open').click({ force: true });
});

Cypress.Commands.add('openJob', (jobNumber = 0) => {
    let tdText = '';
    cy.get('.ant-table-tbody')
        .contains(/^0-/)
        .parent()
        .find('td')
        .eq(0)
        .invoke('text')
        .then(($tdText) => {
            tdText = Number($tdText.match(/\d+/g)) + jobNumber;
            cy.get('.ant-table-tbody').contains('a', `Job #${tdText}`).click();
        });
    cy.url().should('include', '/jobs');
});

Cypress.Commands.add('openTaskJob', (taskName, jobNumber = 0) => {
    cy.openTask(taskName);
    cy.openJob(jobNumber);
});

Cypress.Commands.add('createRectangle', (createRectangleParams) => {
    cy.get('.cvat-draw-rectangle-control').click();
    cy.switchLabel(createRectangleParams.labelName, 'rectangle');
    cy.contains('Draw new rectangle')
        .parents('.cvat-draw-shape-popover-content')
        .within(() => {
            cy.get('.ant-select-selection-selected-value').then(($labelValue) => {
                selectedValueGlobal = $labelValue.text();
            });
            cy.get('.ant-radio-wrapper').contains(createRectangleParams.points).click();
            cy.get('button').contains(createRectangleParams.type).click({ force: true });
        });
    cy.get('.cvat-canvas-container').click(createRectangleParams.firstX, createRectangleParams.firstY);
    cy.get('.cvat-canvas-container').click(createRectangleParams.secondX, createRectangleParams.secondY);
    if (createRectangleParams.points === 'By 4 Points') {
        cy.get('.cvat-canvas-container').click(createRectangleParams.thirdX, createRectangleParams.thirdY);
        cy.get('.cvat-canvas-container').click(createRectangleParams.fourthX, createRectangleParams.fourthY);
    }
    cy.checkObjectParameters(createRectangleParams, 'RECTANGLE');
});

Cypress.Commands.add('switchLabel', (labelName, objectType) => {
    const pattern = `^(Draw new|Setup) ${objectType}$`
    const regex =  new RegExp(pattern, 'g');
    cy.contains(regex).parents('.cvat-draw-shape-popover-content').within(() => {
        cy.get('.ant-select-selection-selected-value').click();
    });
    cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').contains(new RegExp(`^${labelName}$`, 'g')).click();
});

Cypress.Commands.add('checkObjectParameters', (objectParameters, objectType) => {
    let listCanvasShapeId = [];
    cy.document().then((doc) => {
        const listCanvasShape = Array.from(doc.querySelectorAll('.cvat_canvas_shape'));
        for (let i = 0; i < listCanvasShape.length; i++) {
            listCanvasShapeId.push(listCanvasShape[i].id.match(/\d+$/));
        }
        const maxId = Math.max(...listCanvasShapeId);
        cy.get(`#cvat_canvas_shape_${maxId}`).should('exist').and('be.visible');
        cy.get(`#cvat-objects-sidebar-state-item-${maxId}`)
            .should('contain', maxId)
            .and('contain', `${objectType} ${objectParameters.type.toUpperCase()}`)
            .within(() => {
                cy.get('.ant-select-selection-selected-value').should('have.text', selectedValueGlobal);
            });
    });
});

Cypress.Commands.add('createPoint', (createPointParams) => {
    cy.get('.cvat-draw-points-control').click();
    cy.switchLabel(createPointParams.labelName, 'points');
    cy.contains('Draw new points')
        .parents('.cvat-draw-shape-popover-content')
        .within(() => {
            cy.get('.ant-select-selection-selected-value').then(($labelValue) => {
                selectedValueGlobal = $labelValue.text();
            });
            if (createPointParams.numberOfPoints) {
                createPointParams.complete = false;
                cy.get('.ant-input-number-input').clear().type(createPointParams.numberOfPoints);
            }
            cy.get('button').contains(createPointParams.type).click({ force: true });
        });
    createPointParams.pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
    if (createPointParams.complete) {
        cy.get('.cvat-canvas-container').trigger('keydown', { key: 'n' }).trigger('keyup', { key: 'n' });
    }
    cy.checkObjectParameters(createPointParams, 'POINTS');
});

Cypress.Commands.add('changeAppearance', (colorBy) => {
    cy.get('.cvat-appearance-color-by-radio-group').within(() => {
        cy.get('[type="radio"]').check(colorBy, { force: true });
    });
});

Cypress.Commands.add('shapeGrouping', (firstX, firstY, lastX, lastY) => {
    cy.get('.cvat-canvas-container')
        .trigger('keydown', { key: 'g' })
        .trigger('keyup', { key: 'g' })
        .trigger('mousedown', firstX, firstY, { which: 1 })
        .trigger('mousemove', lastX, lastY)
        .trigger('mouseup', lastX, lastY)
        .trigger('keydown', { key: 'g' })
        .trigger('keyup', { key: 'g' });
});

Cypress.Commands.add('createPolygon', (createPolygonParams) => {
    if (!createPolygonParams.reDraw) {
        cy.get('.cvat-draw-polygon-control').click();
        cy.switchLabel(createPolygonParams.labelName, 'polygon');
        cy.contains('Draw new polygon')
            .parents('.cvat-draw-shape-popover-content')
            .within(() => {
                cy.get('.ant-select-selection-selected-value').then(($labelValue) => {
                    selectedValueGlobal = $labelValue.text();
                });
                if (createPolygonParams.numberOfPoints) {
                    createPolygonParams.complete = false;
                    cy.get('.ant-input-number-input').clear().type(createPolygonParams.numberOfPoints);
                }
                cy.get('button').contains(createPolygonParams.type).click({ force: true });
            });
    }
    createPolygonParams.pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
    if (createPolygonParams.complete) {
        cy.get('.cvat-canvas-container').trigger('keydown', { key: 'n' }).trigger('keyup', { key: 'n' });
    }
    cy.checkObjectParameters(createPolygonParams, 'POLYGON');
});

Cypress.Commands.add('openSettings', () => {
    cy.get('.cvat-right-header').find('.cvat-header-menu-dropdown').trigger('mouseover', { which: 1 });
    cy.get('.anticon-setting').click();
});

Cypress.Commands.add('closeSettings', () => {
    cy.get('.ant-modal-content')
        .should('contain', 'Settings')
        .within(() => {
            cy.contains('button', 'Close').click();
        });
});

Cypress.Commands.add('changeWorkspace', (mode, labelName) => {
    cy.get('.cvat-workspace-selector').click();
    cy.get('.ant-select-dropdown-menu-item').contains(mode).click();
    cy.get('.cvat-workspace-selector').should('contain.text', mode);
    cy.changeLabelAAM(labelName);
});

Cypress.Commands.add('changeLabelAAM', (labelName) => {
    cy.get('.cvat-workspace-selector').then((value) => {
        const cvatWorkspaceSelectorValue = value.text();
        if (cvatWorkspaceSelectorValue === 'Attribute annotation') {
            cy.get('.attribute-annotation-sidebar-basics-editor').within(() => {
                cy.get('.ant-select-selection').click();
            });
            cy.get('.ant-select-dropdown').not('.ant-select-dropdown-hidden').contains(new RegExp(`^${labelName}$`, 'g')).click();
        }
    });
});

Cypress.Commands.add('createCuboid', (createCuboidParams) => {
    cy.get('.cvat-draw-cuboid-control').click();
    cy.switchLabel(createCuboidParams.labelName, 'cuboid');
    cy.contains('Draw new cuboid')
        .parents('.cvat-draw-shape-popover-content')
        .within(() => {
            cy.get('.ant-select-selection-selected-value').then(($labelValue) => {
                selectedValueGlobal = $labelValue.text();
            });
            cy.contains(createCuboidParams.points).click();
            cy.get('button').contains(createCuboidParams.type).click({ force: true });
        });
    cy.get('.cvat-canvas-container').click(createCuboidParams.firstX, createCuboidParams.firstY);
    cy.get('.cvat-canvas-container').click(createCuboidParams.secondX, createCuboidParams.secondY);
    if (createCuboidParams.points === 'By 4 Points') {
        cy.get('.cvat-canvas-container').click(createCuboidParams.thirdX, createCuboidParams.thirdY);
        cy.get('.cvat-canvas-container').click(createCuboidParams.fourthX, createCuboidParams.fourthY);
    }
    cy.checkObjectParameters(createCuboidParams, 'CUBOID');
});

Cypress.Commands.add('updateAttributes', (multiAttrParams) => {
    cy.contains('button', 'Add an attribute').click();
    cy.get('[placeholder="Name"]').first().type(multiAttrParams.additionalAttrName);
    cy.get('div[title="Select"]').first().click();
    cy.get('.ant-select-dropdown').last().contains(multiAttrParams.typeAttribute).click();
    cy.get('[placeholder="Default value"]').first().type(multiAttrParams.additionalValue);
});

Cypress.Commands.add('createPolyline', (createPolylineParams) => {
    cy.get('.cvat-draw-polyline-control').click();
    cy.switchLabel(createPolylineParams.labelName, 'polyline');
    cy.contains('Draw new polyline')
        .parents('.cvat-draw-shape-popover-content')
        .within(() => {
            cy.get('.ant-select-selection-selected-value').then(($labelValue) => {
                selectedValueGlobal = $labelValue.text();
            });
            if (createPolylineParams.numberOfPoints) {
                createPolylineParams.complete = false;
                cy.get('.ant-input-number-input').clear().type(createPolylineParams.numberOfPoints);
            }
            cy.get('button').contains(createPolylineParams.type).click({ force: true });
        });
    createPolylineParams.pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
    if (createPolylineParams.complete) {
        cy.get('.cvat-canvas-container').trigger('keydown', { key: 'n' }).trigger('keyup', { key: 'n' });
    }
    cy.checkObjectParameters(createPolylineParams, 'POLYLINE');
});

Cypress.Commands.add('getTaskID', (taskName) => {
    cy.contains('strong', taskName)
        .parents('.cvat-tasks-list-item')
        .within(() => {
            cy.get('span')
                .invoke('text')
                .then((text) => {
                    return String(text.match(/^#\d+\:/g)).replace(/[^\d]/g, '');
                });
        });
});

Cypress.Commands.add('deleteTask', (taskName, taskID) => {
    cy.contains('strong', taskName).parents('.cvat-tasks-list-item').find('.cvat-menu-icon').trigger('mouseover');
    cy.get('.cvat-actions-menu').contains('Delete').click();
    cy.get('.ant-modal-content')
        .should('contain', `The task ${taskID} will be deleted`)
        .within(() => {
            cy.contains('button', 'Delete').click();
        });
});

Cypress.Commands.add('advancedConfiguration', (advancedConfigurationParams) => {
    cy.contains('Advanced configuration').click();
    if (advancedConfigurationParams.multiJobs) {
        cy.get('#segmentSize').type(advancedConfigurationParams.segmentSize);
    }
    if (advancedConfigurationParams.sssFrame) {
        cy.get('#startFrame').type(advancedConfigurationParams.startFrame);
        cy.get('#stopFrame').type(advancedConfigurationParams.stopFrame);
        cy.get('#frameStep').type(advancedConfigurationParams.frameStep);
    }
});

Cypress.Commands.add('removeAnnotations', () => {
    cy.get('.cvat-annotation-header-button').eq(0).click();
    cy.get('.cvat-annotation-menu').within(() => {
        cy.contains('Remove annotations').click();
    });
    cy.get('.ant-modal-content').within(() => {
        cy.get('.ant-btn-danger').click();
    });
});

Cypress.Commands.add('goToTaskList', () => {
    cy.get('a[value="tasks"]').click();
});

Cypress.Commands.add('addNewLabel', (newLabelName) => {
    let listCvatConstructorViewerItemText = [];
    cy.document().then((doc) => {
        const labels = Array.from(doc.querySelectorAll('.cvat-constructor-viewer-item'));
        for (let i = 0; i < labels.length; i++) {
            listCvatConstructorViewerItemText.push(labels[i].textContent);
        }
        if (listCvatConstructorViewerItemText.indexOf(newLabelName) === -1) {
            cy.contains('button', 'Add label').click();
            cy.get('[placeholder="Label name"]').type(newLabelName);
            cy.contains('button', 'Done').click();
        }
    });
});

Cypress.Commands.add('createTag', (labelName) => {
    cy.get('.cvat-setup-tag-control').click();
    cy.switchLabel(labelName, 'tag');
    cy.contains('Setup tag').parents('.cvat-draw-shape-popover-content').within(() => {
        cy.get('button').click();
    });
});
