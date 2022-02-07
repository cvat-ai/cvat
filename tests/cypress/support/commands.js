// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { decomposeMatrix } from './utils';

require('cypress-file-upload');
require('../plugins/imageGenerator/imageGeneratorCommand');
require('../plugins/createZipArchive/createZipArchiveCommand');
require('cypress-localstorage-commands');
require('../plugins/compareImages/compareImagesCommand');
require('../plugins/unpackZipArchive/unpackZipArchiveCommand');
require('cy-verify-downloads').addCustomCommand();

let selectedValueGlobal = '';

Cypress.Commands.add('login', (username = Cypress.env('user'), password = Cypress.env('password'), page = 'tasks') => {
    cy.get('[placeholder="Username"]').type(username);
    cy.get('[placeholder="Password"]').type(password);
    cy.get('[type="submit"]').click();
    cy.url().should('contain', `/${page}`);
    cy.document().then((doc) => {
        const loadSettingFailNotice = Array.from(doc.querySelectorAll('.cvat-notification-notice-load-settings-fail'));
        if (loadSettingFailNotice.length > 0) {
            cy.closeNotification('.cvat-notification-notice-load-settings-fail');
        }
    });
});

Cypress.Commands.add('logout', (username = Cypress.env('user')) => {
    cy.get('.cvat-right-header').within(() => {
        cy.get('.cvat-header-menu-user-dropdown-user').should('have.text', username).trigger('mouseover');
    });
    cy.get('span[aria-label="logout"]').click();
    cy.url().should('include', '/auth/login');
    cy.visit('/auth/login'); // clear query parameter "next"
    cy.closeModalUnsupportedPlatform();
});

Cypress.Commands.add('userRegistration', (firstName, lastName, userName, emailAddr, password) => {
    cy.get('#firstName').type(firstName);
    cy.get('#lastName').type(lastName);
    cy.get('#username').type(userName);
    cy.get('#email').type(emailAddr);
    cy.get('#password1').type(password);
    cy.get('#password2').type(password);
    cy.get('.register-form-button').click();
    if (Cypress.browser.family === 'chromium') {
        cy.url().should('include', '/tasks');
    }
});

Cypress.Commands.add('getAuthKey', () => {
    cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
            username: Cypress.env('user'),
            email: Cypress.env('email'),
            password: Cypress.env('password'),
        },
    });
});

Cypress.Commands.add('deleteUsers', (authResponse, accountsToDelete) => {
    const authKey = authResponse.body.key;
    cy.request({
        url: '/api/users?page_size=all',
        headers: {
            Authorization: `Token ${authKey}`,
        },
    }).then((_response) => {
        const responseResult = _response.body.results;
        for (const user of responseResult) {
            const { id, username } = user;
            for (const account of accountsToDelete) {
                if (username === account) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/users/${id}`,
                        headers: {
                            Authorization: `Token ${authKey}`,
                        },
                    });
                }
            }
        }
    });
});

Cypress.Commands.add('changeUserActiveStatus', (authKey, accountsToChangeActiveStatus, isActive) => {
    cy.request({
        url: '/api/users?page_size=all',
        headers: {
            Authorization: `Token ${authKey}`,
        },
    }).then((response) => {
        const responceResult = response.body.results;
        responceResult.forEach((user) => {
            const userId = user.id;
            const userName = user.username;
            if (userName.includes(accountsToChangeActiveStatus)) {
                cy.request({
                    method: 'PATCH',
                    url: `/api/users/${userId}`,
                    headers: {
                        Authorization: `Token ${authKey}`,
                    },
                    body: {
                        is_active: isActive,
                    },
                });
            }
        });
    });
});

Cypress.Commands.add('checkUserStatuses', (authKey, userName, staffStatus, superuserStatus, activeStatus) => {
    cy.request({
        url: '/api/users?page_size=all',
        headers: {
            Authorization: `Token ${authKey}`,
        },
    }).then((response) => {
        const responceResult = response.body.results;
        responceResult.forEach((user) => {
            if (user.username.includes(userName)) {
                expect(staffStatus).to.be.equal(user.is_staff);
                expect(superuserStatus).to.be.equal(user.is_superuser);
                expect(activeStatus).to.be.equal(user.is_active);
            }
        });
    });
});

Cypress.Commands.add('deleteTasks', (authResponse, tasksToDelete) => {
    const authKey = authResponse.body.key;
    cy.request({
        url: '/api/tasks?page_size=all',
        headers: {
            Authorization: `Token ${authKey}`,
        },
    }).then((_response) => {
        const responceResult = _response.body.results;
        for (const task of responceResult) {
            const { id, name } = task;
            for (const taskToDelete of tasksToDelete) {
                if (name === taskToDelete) {
                    cy.request({
                        method: 'DELETE',
                        url: `/api/tasks/${id}`,
                        headers: {
                            Authorization: `Token ${authKey}`,
                        },
                    });
                }
            }
        }
    });
});

Cypress.Commands.add(
    'createAnnotationTask',
    (
        taskName = 'New annotation task',
        labelName = 'Some label',
        attrName = 'Some attr name',
        textDefaultValue = 'Some default value for type Text',
        image = 'image.png',
        multiAttrParams,
        advancedConfigurationParams,
        forProject = false,
        attachToProject = false,
        projectName,
        expectedResult = 'success',
        projectSubsetFieldValue = 'Test',
    ) => {
        cy.get('#cvat-create-task-button').click({ force: true });
        cy.url().should('include', '/tasks/create');
        cy.get('[id="name"]').type(taskName);
        if (!forProject) {
            cy.get('.cvat-constructor-viewer-new-item').click();
            cy.get('[placeholder="Label name"]').type(labelName);
            cy.get('.cvat-new-attribute-button').click();
            cy.get('[placeholder="Name"]').type(attrName);
            cy.get('.cvat-attribute-type-input').click();
            cy.get('.cvat-attribute-type-input-text').click();
            cy.get('[placeholder="Default value"]').type(textDefaultValue);
            if (multiAttrParams) {
                cy.updateAttributes(multiAttrParams);
            }
            cy.contains('button', 'Done').click();
        } else {
            if (attachToProject) {
                cy.get('.cvat-project-search-field').click();
                cy.get('.ant-select-dropdown')
                    .not('.ant-select-dropdown-hidden')
                    .within(() => {
                        cy.get(`.ant-select-item-option[title="${projectName}"]`).click();
                    });
            }
            cy.get('.cvat-project-search-field').within(() => {
                cy.get('[type="search"]').should('have.value', projectName);
            });
            cy.get('.cvat-project-subset-field').type(projectSubsetFieldValue);
            cy.get('.cvat-constructor-viewer-new-item').should('not.exist');
        }
        cy.get('input[type="file"]').attachFile(image, { subjectType: 'drag-n-drop' });
        if (advancedConfigurationParams) {
            cy.advancedConfiguration(advancedConfigurationParams);
        }
        cy.contains('button', 'Submit').click();
        if (expectedResult === 'success') {
            cy.get('.cvat-notification-create-task-success').should('exist').find('[data-icon="close"]').click();
        }
        if (!forProject) {
            cy.goToTaskList();
        } else {
            cy.goToProjectsList();
        }
    },
);

Cypress.Commands.add('openTask', (taskName, projectSubsetFieldValue) => {
    cy.contains('strong', new RegExp(`^${taskName}$`))
        .parents('.cvat-tasks-list-item')
        .contains('a', 'Open').click({ force: true });
    cy.get('.cvat-task-details').should('exist');
    if (projectSubsetFieldValue) {
        cy.get('.cvat-project-subset-field').find('input').should('have.attr', 'value', projectSubsetFieldValue);
    }
});

Cypress.Commands.add('saveJob', (method = 'PATCH', status = 200, as = 'saveJob') => {
    cy.intercept(method, '/api/jobs/**').as(as);
    cy.get('button').contains('Save').click({ force: true }).trigger('mouseout');
    cy.wait(`@${as}`).its('response.statusCode').should('equal', status);
});

Cypress.Commands.add('getJobNum', (jobID) => {
    const jobsKey = [];
    cy.document().then((doc) => {
        const jobs = Array.from(doc.querySelectorAll('.cvat-task-jobs-table-row'));
        for (let i = 0; i < jobs.length; i++) {
            jobsKey.push(jobs[i].getAttribute('data-row-key'));
        }
        const minKey = Math.min(...jobsKey);
        return minKey + jobID;
    });
});

Cypress.Commands.add('openJob', (jobID = 0, removeAnnotations = true, expectedFail = false) => {
    cy.getJobNum(jobID).then(($job) => {
        cy.get('.cvat-task-jobs-table-row').contains('a', `Job #${$job}`).click();
    });
    cy.url().should('include', '/jobs');
    if (expectedFail) {
        cy.get('.cvat-canvas-container').should('not.exist');
    } else {
        cy.get('.cvat-canvas-container').should('exist');
    }
    if (removeAnnotations) {
        cy.document().then((doc) => {
            const objects = Array.from(doc.querySelectorAll('.cvat_canvas_shape'));
            if (typeof objects !== 'undefined' && objects.length > 0) {
                cy.removeAnnotations();
                cy.saveJob('PUT');
            }
        });
    }
});

Cypress.Commands.add('openTaskJob', (taskName, jobID = 0, removeAnnotations = true, expectedFail = false) => {
    cy.openTask(taskName);
    cy.openJob(jobID, removeAnnotations, expectedFail);
});

Cypress.Commands.add('interactControlButton', (objectType) => {
    cy.get('body').trigger('mousedown');
    cy.get(`.cvat-${objectType}-control`).trigger('mouseover');
    cy.get(`.cvat-${objectType}-popover`)
        .should('be.visible')
        .should('have.attr', 'style')
        .should('not.include', 'pointer-events: none');
});

Cypress.Commands.add('createRectangle', (createRectangleParams) => {
    cy.interactControlButton('draw-rectangle');
    cy.switchLabel(createRectangleParams.labelName, 'draw-rectangle');
    cy.get('.cvat-draw-rectangle-popover').within(() => {
        cy.get('.ant-select-selection-item').then(($labelValue) => {
            selectedValueGlobal = $labelValue.text();
        });
        cy.contains('.ant-radio-wrapper', createRectangleParams.points).click();
        cy.contains('button', createRectangleParams.type).click();
    });
    cy.get('.cvat-canvas-container')
        .click(createRectangleParams.firstX, createRectangleParams.firstY)
        .click(createRectangleParams.secondX, createRectangleParams.secondY);
    if (createRectangleParams.points === 'By 4 Points') {
        cy.get('.cvat-canvas-container')
            .click(createRectangleParams.thirdX, createRectangleParams.thirdY)
            .click(createRectangleParams.fourthX, createRectangleParams.fourthY);
    }
    cy.checkPopoverHidden('draw-rectangle');
    cy.checkObjectParameters(createRectangleParams, 'RECTANGLE');
});

Cypress.Commands.add('switchLabel', (labelName, objectType) => {
    cy.get(`.cvat-${objectType}-popover`).find('.ant-select-selection-item').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .find(`.ant-select-item-option[title="${labelName}"]`)
        .click();
});

Cypress.Commands.add('checkPopoverHidden', (objectType) => {
    cy.get(`.cvat-${objectType}-popover`).should('be.hidden');
});

Cypress.Commands.add('checkObjectParameters', (objectParameters, objectType) => {
    const listCanvasShapeId = [];
    cy.document().then((doc) => {
        const listCanvasShape = Array.from(doc.querySelectorAll('.cvat_canvas_shape'));
        for (let i = 0; i < listCanvasShape.length; i++) {
            listCanvasShapeId.push(listCanvasShape[i].id.match(/\d+$/));
        }
        const maxId = Math.max(...listCanvasShapeId);
        cy.get(`#cvat_canvas_shape_${maxId}`).should('be.visible');
        cy.get(`#cvat-objects-sidebar-state-item-${maxId}`)
            .should('contain', maxId)
            .and('contain', `${objectType} ${objectParameters.type.toUpperCase()}`)
            .within(() => {
                cy.get('.ant-select-selection-item').should('have.text', selectedValueGlobal);
            });
    });
});

Cypress.Commands.add('createPoint', (createPointParams) => {
    cy.interactControlButton('draw-points');
    cy.switchLabel(createPointParams.labelName, 'draw-points');
    cy.get('.cvat-draw-points-popover').within(() => {
        cy.get('.ant-select-selection-item').then(($labelValue) => {
            selectedValueGlobal = $labelValue.text();
        });
        if (createPointParams.numberOfPoints) {
            cy.get('.ant-input-number-input').clear().type(createPointParams.numberOfPoints);
        }
        cy.contains('button', createPointParams.type).click();
    });
    createPointParams.pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
    if (createPointParams.finishWithButton) {
        cy.contains('span', 'Done').click();
    } else if (!createPointParams.numberOfPoints) {
        const keyCodeN = 78;
        cy.get('.cvat-canvas-container')
            .trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' })
            .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
    }
    cy.checkPopoverHidden('draw-points');
    cy.checkObjectParameters(createPointParams, 'POINTS');
});

Cypress.Commands.add('createEllipse', (createEllipseParams) => {
    cy.interactControlButton('draw-ellipse');
    cy.switchLabel(createEllipseParams.labelName, 'draw-ellipse');
    cy.get('.cvat-draw-ellipse-popover').within(() => {
        cy.get('.ant-select-selection-item').then(($labelValue) => {
            selectedValueGlobal = $labelValue.text();
        });
        cy.contains('button', createEllipseParams.type).click();
    });
    cy.get('.cvat-canvas-container')
        .click(createEllipseParams.cx, createEllipseParams.cy)
        .click(createEllipseParams.rightX, createEllipseParams.topY);
    cy.checkPopoverHidden('draw-ellipse');
    cy.checkObjectParameters(createEllipseParams, 'ELLIPSE');
});

Cypress.Commands.add('changeAppearance', (colorBy) => {
    cy.get('.cvat-appearance-color-by-radio-group').within(() => {
        cy.get('[type="radio"]').check(colorBy, { force: true });
    });
});

Cypress.Commands.add('shapeGrouping', (firstX, firstY, lastX, lastY) => {
    const keyCodeG = 71;
    cy.get('.cvat-canvas-container')
        .trigger('keydown', { keyCode: keyCodeG, code: 'KeyG' })
        .trigger('keyup', { keyCode: keyCodeG, code: 'KeyG' })
        .trigger('mousedown', firstX, firstY, { which: 1 })
        .trigger('mousemove', lastX, lastY)
        .trigger('mouseup', lastX, lastY)
        .trigger('keydown', { keyCode: keyCodeG, code: 'KeyG' })
        .trigger('keyup', { keyCode: keyCodeG, code: 'KeyG' });
});

Cypress.Commands.add('createPolygon', (createPolygonParams) => {
    if (!createPolygonParams.reDraw) {
        cy.interactControlButton('draw-polygon');
        cy.switchLabel(createPolygonParams.labelName, 'draw-polygon');
        cy.get('.cvat-draw-polygon-popover').within(() => {
            cy.get('.ant-select-selection-item').then(($labelValue) => {
                selectedValueGlobal = $labelValue.text();
            });
            if (createPolygonParams.numberOfPoints) {
                cy.get('.ant-input-number-input').clear().type(createPolygonParams.numberOfPoints);
            }
            cy.contains('button', createPolygonParams.type).click();
        });
    }
    createPolygonParams.pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
    if (createPolygonParams.finishWithButton) {
        cy.contains('span', 'Done').click();
    } else if (!createPolygonParams.numberOfPoints) {
        const keyCodeN = 78;
        cy.get('.cvat-canvas-container')
            .trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' })
            .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
    }
    cy.checkPopoverHidden('draw-polygon');
    cy.checkObjectParameters(createPolygonParams, 'POLYGON');
});

Cypress.Commands.add('openSettings', () => {
    cy.get('.cvat-right-header').find('.cvat-header-menu-user-dropdown').trigger('mouseover', { which: 1 });
    cy.get('.anticon-setting').click();
    cy.get('.cvat-settings-modal').should('be.visible');
});

Cypress.Commands.add('closeSettings', () => {
    cy.get('.cvat-settings-modal').within(() => {
        cy.contains('button', 'Close').click();
    });
    cy.get('.cvat-settings-modal').should('not.be.visible');
});

Cypress.Commands.add('saveSettings', () => {
    cy.get('.cvat-settings-modal').within(() => {
        cy.contains('button', 'Save').click();
    });
});

Cypress.Commands.add('changeWorkspace', (mode) => {
    cy.get('.cvat-workspace-selector').click();
    cy.get('.cvat-workspace-selector-dropdown').within(() => {
        cy.get(`.ant-select-item-option[title="${mode}"]`).click();
    });

    cy.get('.cvat-workspace-selector').should('contain.text', mode);
});

Cypress.Commands.add('changeLabelAAM', (labelName) => {
    cy.get('.cvat-workspace-selector').then((value) => {
        const cvatWorkspaceSelectorValue = value.text();
        if (cvatWorkspaceSelectorValue.includes('Attribute annotation')) {
            cy.get('.cvat-attribute-annotation-sidebar-basics-editor').within(() => {
                cy.get('.ant-select-selector').click();
            });
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.get(`.ant-select-item-option[title="${labelName}"]`).click();
                });
        }
    });
});

Cypress.Commands.add('createCuboid', (createCuboidParams) => {
    cy.interactControlButton('draw-cuboid');
    cy.switchLabel(createCuboidParams.labelName, 'draw-cuboid');
    cy.get('.cvat-draw-cuboid-popover').within(() => {
        cy.get('.ant-select-selection-item').then(($labelValue) => {
            selectedValueGlobal = $labelValue.text();
        });
        cy.contains(createCuboidParams.points).click();
        cy.contains('button', createCuboidParams.type).click();
    });
    cy.get('.cvat-canvas-container').click(createCuboidParams.firstX, createCuboidParams.firstY);
    cy.get('.cvat-canvas-container').click(createCuboidParams.secondX, createCuboidParams.secondY);
    if (createCuboidParams.points === 'By 4 Points') {
        cy.get('.cvat-canvas-container').click(createCuboidParams.thirdX, createCuboidParams.thirdY);
        cy.get('.cvat-canvas-container').click(createCuboidParams.fourthX, createCuboidParams.fourthY);
    }
    cy.checkPopoverHidden('draw-cuboid');
    cy.checkObjectParameters(createCuboidParams, 'CUBOID');
});

Cypress.Commands.add('updateAttributes', (multiAttrParams) => {
    const cvatAttributeInputsWrapperId = [];
    cy.get('.cvat-new-attribute-button').click();
    cy.document().then((doc) => {
        const cvatAttributeInputsWrapperList = Array.from(doc.querySelectorAll('.cvat-attribute-inputs-wrapper'));
        for (let i = 0; i < cvatAttributeInputsWrapperList.length; i++) {
            cvatAttributeInputsWrapperId.push(cvatAttributeInputsWrapperList[i].getAttribute('cvat-attribute-id'));
        }

        const minId = Math.min(...cvatAttributeInputsWrapperId);

        cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
            cy.get('.cvat-attribute-name-input').type(multiAttrParams.additionalAttrName);
            cy.get('.cvat-attribute-type-input').click();
        });
        cy.get('.ant-select-dropdown')
            .not('.ant-select-dropdown-hidden')
            .within(() => {
                cy.get(`.ant-select-item-option[title="${multiAttrParams.typeAttribute}"]`).click();
            });

        if (multiAttrParams.typeAttribute === 'Text' || multiAttrParams.typeAttribute === 'Number') {
            cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
                if (multiAttrParams.additionalValue !== '') {
                    cy.get('.cvat-attribute-values-input').type(multiAttrParams.additionalValue);
                } else {
                    cy.get('.cvat-attribute-values-input').clear();
                }
            });
        } else if (multiAttrParams.typeAttribute === 'Radio') {
            cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
                cy.get('.cvat-attribute-values-input').type(`${multiAttrParams.additionalValue}{Enter}`);
            });
        } else if (multiAttrParams.typeAttribute === 'Checkbox') {
            cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
                cy.get('.cvat-attribute-values-input').click();
            });
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .within(() => {
                    cy.get(`.ant-select-item-option[title="${multiAttrParams.additionalValue}"]`).click();
                });
        }
        if (multiAttrParams.mutable) {
            cy.get('.cvat-attribute-mutable-checkbox')
                .find('[type="checkbox"]')
                .should('not.be.checked')
                .check()
                .should('be.checked');
        }
    });
});

Cypress.Commands.add('createPolyline', (createPolylineParams) => {
    cy.interactControlButton('draw-polyline');
    cy.switchLabel(createPolylineParams.labelName, 'draw-polyline');
    cy.get('.cvat-draw-polyline-popover').within(() => {
        cy.get('.ant-select-selection-item').then(($labelValue) => {
            selectedValueGlobal = $labelValue.text();
        });
        if (createPolylineParams.numberOfPoints) {
            cy.get('.ant-input-number-input').clear().type(createPolylineParams.numberOfPoints);
        }
        cy.contains('button', createPolylineParams.type).click();
    });
    createPolylineParams.pointsMap.forEach((element) => {
        cy.get('.cvat-canvas-container').click(element.x, element.y);
    });
    if (createPolylineParams.finishWithButton) {
        cy.contains('span', 'Done').click();
    } else if (!createPolylineParams.numberOfPoints) {
        const keyCodeN = 78;
        cy.get('.cvat-canvas-container')
            .trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' })
            .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
    }
    cy.checkPopoverHidden('draw-polyline');
    cy.checkObjectParameters(createPolylineParams, 'POLYLINE');
});

Cypress.Commands.add('deleteTask', (taskName) => {
    let taskId = '';
    cy.contains('.cvat-item-task-name', new RegExp(`^${taskName}$`))
        .parents('.cvat-task-item-description')
        .find('.cvat-item-task-id')
        .then(($taskId) => {
            taskId = $taskId.text().replace(/[^\d]/g, '');
            cy.contains('.cvat-item-task-name', new RegExp(`^${taskName}$`))
                .parents('.cvat-tasks-list-item')
                .find('.cvat-menu-icon')
                .trigger('mouseover');
            cy.get('.cvat-actions-menu')
                .should('be.visible')
                .find('[role="menuitem"]')
                .filter(':contains("Delete")')
                .last()
                .click();
            cy.get('.cvat-modal-confirm-delete-task')
                .should('contain', `The task ${taskId} will be deleted`)
                .within(() => {
                    cy.contains('button', 'Delete').click();
                });
            cy.get('.cvat-actions-menu').should('be.hidden');
        });
    cy.contains('.cvat-item-task-name', new RegExp(`^${taskName}$`))
        .parents('.cvat-tasks-list-item')
        .should('have.attr', 'style')
        .and('contain', 'pointer-events: none; opacity: 0.5;');
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
    if (advancedConfigurationParams.chunkSize) {
        cy.get('#dataChunkSize').type(advancedConfigurationParams.chunkSize);
    }

    if (advancedConfigurationParams.overlapSize) {
        cy.get('#overlapSize').type(advancedConfigurationParams.overlapSize);
    }
});

Cypress.Commands.add('removeAnnotations', () => {
    cy.contains('.cvat-annotation-header-button', 'Menu').click();
    cy.get('.cvat-annotation-menu').within(() => {
        cy.contains('Remove annotations').click();
    });
    cy.get('.cvat-modal-confirm-remove-annotation').within(() => {
        cy.contains('button', 'Delete').click();
    });
});

Cypress.Commands.add('goToTaskList', () => {
    cy.get('a[value="tasks"]').click();
    cy.url().should('include', '/tasks');
});

Cypress.Commands.add('changeColorViaBadge', (labelColor) => {
    cy.get('.cvat-label-color-picker')
        .not('.ant-popover-hidden')
        .should('be.visible')
        .within(() => {
            cy.contains('hex').prev().clear().type(labelColor);
            cy.contains('button', 'Ok').click();
        });
    cy.get('.cvat-label-color-picker').should('be.hidden');
});

Cypress.Commands.add('collectLabelsName', () => {
    const listCvatConstructorViewerItemText = [];
    cy.get('.cvat-constructor-viewer').should('exist');
    cy.document().then((doc) => {
        const labels = Array.from(doc.querySelectorAll('.cvat-constructor-viewer-item'));
        for (let i = 0; i < labels.length; i++) {
            listCvatConstructorViewerItemText.push(labels[i].textContent);
        }
        return listCvatConstructorViewerItemText;
    });
});

Cypress.Commands.add('deleteLabel', (labelName) => {
    cy.contains('.cvat-constructor-viewer-item', new RegExp(`^${labelName}$`))
        .should('exist')
        .and('be.visible')
        .find('[aria-label="delete"]')
        .click();
    cy.intercept('PATCH', /\/api\/(tasks|projects)\/.*/).as('deleteLabel');
    cy.get('.cvat-modal-delete-label')
        .should('be.visible')
        .within(() => {
            cy.contains('[type="button"]', 'OK').click();
        });
    cy.wait('@deleteLabel').its('response.statusCode').should('equal', 200);
    cy.contains('.cvat-constructor-viewer-item', new RegExp(`^${labelName}$`)).should('not.exist');
});

Cypress.Commands.add('addNewLabel', (newLabelName, additionalAttrs, labelColor) => {
    cy.collectLabelsName().then((labelsNames) => {
        if (labelsNames.includes(newLabelName)) {
            cy.deleteLabel(newLabelName);
        }
    });
    cy.contains('button', 'Add label').click();
    cy.get('[placeholder="Label name"]').type(newLabelName);
    if (labelColor) {
        cy.get('.cvat-change-task-label-color-badge').click();
        cy.changeColorViaBadge(labelColor);
    }
    if (additionalAttrs) {
        for (let i = 0; i < additionalAttrs.length; i++) {
            cy.updateAttributes(additionalAttrs[i]);
        }
    }
    cy.contains('button', 'Done').click();
    cy.get('.cvat-constructor-viewer').should('be.visible');
    cy.contains('.cvat-constructor-viewer-item', new RegExp(`^${newLabelName}$`)).should('exist');
});

Cypress.Commands.add('addNewLabelViaContinueButton', (additionalLabels) => {
    cy.collectLabelsName().then((labelsNames) => {
        if (additionalLabels.some((el) => labelsNames.indexOf(el) === -1)) {
            cy.get('.cvat-constructor-viewer-new-item').click();
            for (let j = 0; j < additionalLabels.length; j++) {
                cy.get('[placeholder="Label name"]').type(additionalLabels[j]);
                if (j !== additionalLabels.length - 1) {
                    cy.contains('button', 'Continue').click();
                } else {
                    cy.contains('button', 'Done').click();
                }
            }
        }
    });
});

Cypress.Commands.add('createTag', (labelName) => {
    cy.interactControlButton('setup-tag');
    cy.switchLabel(labelName, 'setup-tag');
    cy.get('.cvat-setup-tag-popover').within(() => {
        cy.get('button').click();
    });
});

Cypress.Commands.add('sidebarItemSortBy', (sortBy) => {
    cy.get('.cvat-objects-sidebar-ordering-selector').click();
    cy.get('.cvat-objects-sidebar-ordering-dropdown').within(() => {
        cy.get(`.ant-select-item-option[title="${sortBy}"]`).click();
    });
});

Cypress.Commands.add('goToRegisterPage', () => {
    cy.get('a[href="/auth/register"]').click();
    cy.url().should('include', '/auth/register');
});

Cypress.Commands.add('getScaleValue', () => {
    cy.get('#cvat_canvas_background')
        .should('have.attr', 'style')
        .then(($styles) => (Number($styles.match(/scale\((\d\.\d+)\)/m)[1])));
});

Cypress.Commands.add('goCheckFrameNumber', (frameNum) => {
    cy.get('.cvat-player-frame-selector').within(() => {
        cy.get('input[role="spinbutton"]')
            .clear({ force: true })
            .type(`${frameNum}{Enter}`, { force: true })
            .should('have.value', frameNum);
    });
});

Cypress.Commands.add('checkFrameNum', (frameNum) => {
    cy.get('.cvat-player-frame-selector').within(() => {
        cy.get('input[role="spinbutton"]').should('have.value', frameNum);
    });
});

Cypress.Commands.add('goToNextFrame', (expectedFrameNum) => {
    cy.get('.cvat-player-next-button').click().trigger('mouseout');
    cy.checkFrameNum(expectedFrameNum);
});

Cypress.Commands.add('goToPreviousFrame', (expectedFrameNum) => {
    cy.get('.cvat-player-previous-button').click().trigger('mouseout');
    cy.checkFrameNum(expectedFrameNum);
});

Cypress.Commands.add('interactMenu', (choice) => {
    cy.contains('.cvat-annotation-header-button', 'Menu').click();
    cy.get('.cvat-annotation-menu').within(() => {
        cy.contains(new RegExp(`^${choice}$`)).click();
    });
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('setJobState', (choice) => {
    cy.interactMenu('Change job state');
    cy.get('.cvat-annotation-menu-job-state-submenu').within(() => {
        cy.contains(choice).click();
    });
    cy.get('.cvat-modal-content-change-job-state')
        .should('be.visible')
        .within(() => {
            cy.contains('[type="button"]', 'Continue').click();
        });
    cy.get('.cvat-modal-content-change-job-state').should('not.exist');
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('setJobStage', (jobID, stage) => {
    cy.getJobNum(jobID).then(($job) => {
        cy.get('.cvat-task-jobs-table')
            .contains('a', `Job #${$job}`)
            .parents('.cvat-task-jobs-table-row')
            .find('.cvat-job-item-stage').click();
        cy.get('.ant-select-dropdown')
            .should('be.visible')
            .not('.ant-select-dropdown-hidden')
            .within(() => {
                cy.get(`[title="${stage}"]`).click();
            });
        cy.get('.cvat-spinner').should('not.exist');
    });
});

Cypress.Commands.add('closeNotification', (className) => {
    cy.get(className).find('span[aria-label="close"]').click();
    cy.get(className).should('not.exist');
});

Cypress.Commands.add('getObjectIdNumberByLabelName', (labelName) => {
    cy.document().then((doc) => {
        const stateItemLabelSelectorList = Array.from(
            doc.querySelectorAll('.cvat-objects-sidebar-state-item-label-selector'),
        );
        for (let i = 0; i < stateItemLabelSelectorList.length; i++) {
            if (stateItemLabelSelectorList[i].textContent === labelName) {
                cy.get(stateItemLabelSelectorList[i])
                    .parents('.cvat-objects-sidebar-state-item')
                    .should('have.attr', 'id')
                    .then((id) => (Number(id.match(/\d+$/))));
            }
        }
    });
});

Cypress.Commands.add('closeModalUnsupportedPlatform', () => {
    if (Cypress.browser.family !== 'chromium') {
        cy.get('.cvat-modal-unsupported-platform-warning').within(() => {
            cy.contains('button', 'OK').click();
        });
    }
});

Cypress.Commands.add('exportTask', ({
    type, format, archiveCustomeName,
}) => {
    cy.interactMenu('Export task dataset');
    cy.get('.cvat-modal-export-task').should('be.visible').find('.cvat-modal-export-select').click();
    cy.contains('.cvat-modal-export-option-item', format).should('be.visible').click();
    cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').should('contain.text', format);
    if (type === 'dataset') {
        cy.get('.cvat-modal-export-task').find('[type="checkbox"]').should('not.be.checked').check();
    }
    if (archiveCustomeName) {
        cy.get('.cvat-modal-export-task').find('.cvat-modal-export-filename-input').type(archiveCustomeName);
    }
    cy.contains('button', 'OK').click();
    cy.get('.cvat-notification-notice-export-task-start').should('be.visible');
    cy.closeNotification('.cvat-notification-notice-export-task-start');
});

Cypress.Commands.add('renameTask', (oldName, newName) => {
    cy.get('.cvat-task-details-task-name').within(() => {
        cy.get('[aria-label="edit"]').click();
    });
    cy.contains('.cvat-text-color', oldName).clear().type(`${newName}{Enter}`);
    cy.contains('.cvat-task-details-task-name', newName).should('exist');
});

Cypress.Commands.add('shapeRotate', (shape, x, y, expectedRotateDeg, pressShift = false) => {
    cy.get(shape)
        .trigger('mousemove')
        .trigger('mouseover')
        .should('have.class', 'cvat_canvas_shape_activated');
    cy.get('.cvat-canvas-container')
        .trigger('mousemove', x, y)
        .trigger('mouseenter', x, y);
    cy.get('.svg_select_points_rot').should('have.class', 'cvat_canvas_selected_point');
    cy.get('.cvat-canvas-container').trigger('mousedown', x, y, { button: 0 });
    if (pressShift) {
        cy.get('body').type('{shift}', { release: false });
    }
    cy.get('.cvat-canvas-container').trigger('mousemove', x + 20, y);
    cy.get(shape).should('have.attr', 'transform');
    cy.document().then((doc) => {
        const modShapeIDString = shape.substring(1); // Remove "#" from the shape id string
        const shapeTranformMatrix = decomposeMatrix(doc.getElementById(modShapeIDString).getCTM());
        cy.get('#cvat_canvas_text_content').should('contain.text', `${shapeTranformMatrix}°`);
        expect(`${expectedRotateDeg}°`).to.be.equal(`${shapeTranformMatrix}°`);
    });
    cy.get('.cvat-canvas-container').trigger('mouseup');
});
