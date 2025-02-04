// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/* eslint-disable security/detect-non-literal-regexp */

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
    cy.get('#credential').type(username);
    cy.get('#password').type(password);
    cy.get('.cvat-credentials-action-button').click();
    cy.url().should('contain', `/${page}`);
    cy.document().then((doc) => {
        const loadSettingFailNotice = Array.from(doc.querySelectorAll('.cvat-notification-notice-load-settings-fail'));
        if (loadSettingFailNotice.length > 0) {
            cy.closeNotification('.cvat-notification-notice-load-settings-fail');
        }
    });
});

Cypress.Commands.add('logout', () => {
    cy.get('.cvat-header-menu-user-dropdown-user').click();
    cy.get('span[aria-label="logout"]').click();
    cy.url().should('include', '/auth/login');
    cy.clearCookies();
    cy.visit('/auth/login');
    cy.url().should('not.include', '?next=');
    cy.contains('Sign in').should('exist');
});

Cypress.Commands.add('userRegistration', (firstName, lastName, userName, emailAddr, password) => {
    cy.get('#firstName').type(firstName);
    cy.get('#lastName').type(lastName);
    cy.get('#username').type(userName);
    cy.get('#email').type(emailAddr);
    cy.get('#password1').type(password);
    cy.get('.cvat-credentials-action-button').click();
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
        multiAttrParams = null,
        advancedConfigurationParams = null,
        forProject = false,
        attachToProject = false,
        projectName = '',
        expectedResult = 'success',
        projectSubsetFieldValue = 'Test',
        qualityConfigurationParams = null,
    ) => {
        cy.url().then(() => {
            cy.get('.cvat-create-task-dropdown').click();
            cy.get('.cvat-create-task-button').click({ force: true });
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
                cy.contains('button', 'Continue').click();
            } else {
                if (attachToProject) {
                    cy.get('.cvat-project-search-field').click();
                    cy.get('.ant-select-dropdown')
                        .not('.ant-select-dropdown-hidden')
                        .within(() => {
                            cy.get(`.ant-select-item-option[title="${projectName}"]`).click();
                        });
                }
                cy.get('.cvat-project-search-field').first().within(() => {
                    cy.get('[type="search"]').should('have.value', projectName);
                });
                cy.get('.cvat-project-subset-field').type(`${projectSubsetFieldValue}{Enter}`);
                cy.get('.cvat-constructor-viewer-new-item').should('not.exist');
            }
            cy.get('input[type="file"]').attachFile(image, { subjectType: 'drag-n-drop' });
            if (advancedConfigurationParams) {
                cy.advancedConfiguration(advancedConfigurationParams);
            }
            if (qualityConfigurationParams) {
                cy.configureTaskQualityMode(qualityConfigurationParams);
            }
            cy.get('.cvat-submit-continue-task-button').scrollIntoView();
            cy.get('.cvat-submit-continue-task-button').click();
            if (expectedResult === 'success') {
                cy.get('.cvat-notification-create-task-success').should('exist').find('[data-icon="close"]').click();
            } else if (expectedResult === 'fail') {
                cy.get('.cvat-notification-notice-create-task-failed').should('exist').find('[data-icon="close"]').click();
            }
            if (!forProject) {
                cy.goToTaskList();
            } else {
                cy.goToProjectsList();
            }
        });
    },
);

Cypress.Commands.add('selectFilesFromShare', (serverFiles) => {
    cy.intercept('GET', '/api/server/share?**').as('shareRequest');
    cy.contains('[role="tab"]', 'Connected file share').click();
    cy.wait('@shareRequest');

    const selectServerFiles = (files) => {
        if (Array.isArray(files)) {
            cy.get('.cvat-remote-browser-table-wrapper').within(() => {
                files.forEach((file) => {
                    cy.get('.ant-table-cell').contains(file).parent().within(() => {
                        cy.get('.ant-checkbox-input').click();
                    });
                });
            });
            cy.get('.cvat-remote-browser-nav-breadcrumb').contains('root').click();
        } else {
            for (const directory of Object.keys(files)) {
                cy.get('.cvat-remote-browser-table-wrapper').within(() => {
                    cy.get('button').contains(directory).click();
                    cy.wait('@shareRequest');
                });
                selectServerFiles(files[directory]);
            }
        }
    };

    selectServerFiles(serverFiles);
});

Cypress.Commands.add('headlessLogin', ({
    username,
    password,
    nextURL,
} = {}) => {
    cy.window().its('cvat', { timeout: 25000 }).should('not.be.undefined');
    cy.window().then((win) => {
        cy.headlessLogout().then(() => (
            win.cvat.server.login(
                username || Cypress.env('user'),
                password || Cypress.env('password'),
            ).then(() => win.cvat.users.get({ self: true }).then((users) => {
                if (nextURL) {
                    cy.visit(nextURL);
                }

                return users[0];
            }))
        ));
    });
});

Cypress.Commands.add('headlessCreateObjects', (objects, jobID) => {
    const convertShape = ($win, job) => (shape) => ({
        frame: shape.frame,
        type: shape.type,
        points: $win.Array.from(shape.points),
        label_id: job.labels.find((label) => label.name === shape.labelName).id,
        occluded: shape.occluded || false,
        outside: shape.outside || false,
        source: shape.source || 'manual',
        attributes: $win.Array.from(shape.attributes || []),
        elements: $win.Array.from(shape.elements ? shape.elements.map(convertShape) : []),
        rotation: shape.rotation || 0,
        group: shape.group || 0,
        z_order: shape.zOrder || 0,
    });

    const convertTag = ($win, job) => (tag) => ({
        frame: tag.frame,
        label_id: job.labels.find((label) => label.name === tag.labelName).id,
        source: tag.source || 'manual',
        attributes: $win.Array.from(tag.attributes || []),
        group: tag.group || 0,
    });

    const convertTrack = ($win, job) => (track) => ({
        frame: track.frame,
        label_id: job.labels.find((label) => label.name === track.labelName).id,
        group: track.group || 0,
        source: track.source || 'manual',
        attributes: $win.Array.from(track.attributes || []),
        elements: $win.Array.from(track.elements ? track.elements.map(convertTrack) : []),
        shapes: track.shapes.map((shape) => ({
            attributes: $win.Array.from(shape.attributes || []),
            points: $win.Array.from(shape.points),
            frame: shape.frame,
            occluded: shape.occluded || false,
            outside: shape.outside || false,
            rotation: shape.rotation || 0,
            type: shape.type,
            z_order: shape.zOrder || 0,
        })),
    });

    cy.window().then(async ($win) => {
        const job = (await $win.cvat.jobs.get({ jobID }))[0];
        await job.annotations.clear({ reload: true });

        const shapes = objects.filter((object) => object.objectType === 'shape').map(convertShape($win, job));
        const tracks = objects.filter((object) => object.objectType === 'track').map(convertTrack($win, job));
        const tags = objects.filter((object) => object.objectType === 'tag').map(convertTag($win, job));

        await job.annotations.import({
            shapes: $win.Array.from(shapes),
            tracks: $win.Array.from(tracks),
            tags: $win.Array.from(tags),
        });

        await job.annotations.save();
        return cy.wrap();
    });
});

Cypress.Commands.add('headlessCreateTask', (taskSpec, dataSpec, extras) => {
    cy.window().then(async ($win) => {
        const task = new $win.cvat.classes.Task({
            ...taskSpec,
            ...dataSpec,
        });

        if (dataSpec.server_files) {
            task.serverFiles = dataSpec.server_files;
        }

        if (dataSpec.client_files) {
            task.clientFiles = dataSpec.client_files;
        }

        if (dataSpec.remote_files) {
            task.remoteFiles = dataSpec.remote_files;
        }

        const result = await task.save(extras || {});
        return cy.wrap({ taskID: result.id, jobIDs: result.jobs.map((job) => job.id) });
    });
});

Cypress.Commands.add('headlessCreateProject', (projectSpec) => {
    cy.window().then(async ($win) => {
        const project = new $win.cvat.classes.Project({
            ...projectSpec,
        });

        const result = await project.save();
        return cy.wrap({ projectID: result.id });
    });
});

Cypress.Commands.add('headlessDeleteProject', (projectID) => {
    cy.window().then(async ($win) => {
        const [project] = await $win.cvat.projects.get({ id: projectID });
        await project.delete();
    });
});

Cypress.Commands.add('headlessDeleteTask', (taskID) => {
    cy.window().then(async ($win) => {
        const [task] = await $win.cvat.tasks.get({ id: taskID });
        await task.delete();
    });
});

Cypress.Commands.add('headlessCreateUser', (userSpec) => {
    cy.window().its('cvat', { timeout: 25000 }).should('not.be.undefined');
    cy.intercept('POST', '/api/auth/register**', (req) => {
        req.continue((response) => {
            delete response.headers['set-cookie'];
            expect(response.statusCode).to.eq(201);
            expect(response.body.username).to.eq(userSpec.username);
            expect(response.body.email).to.eq(userSpec.email);
        });
    }).as('registerRequest');

    return cy.window().then((win) => (
        win.cvat.server.register(
            userSpec.username,
            userSpec.firstName,
            userSpec.lastName,
            userSpec.email,
            userSpec.password,
            [],
        )
    ));
});

Cypress.Commands.add('headlessLogout', () => {
    // currently it is supposed that headlessLogout does not need core initialized to perform its logic
    // this may be improved in the future, but now this behaviour is enough
    cy.clearCookies();
});

Cypress.Commands.add('headlessCreateJob', (jobSpec) => {
    cy.window().then(async ($win) => {
        const data = {
            ...jobSpec,
        };

        const job = new $win.cvat.classes.Job(data);

        const result = await job.save(data);
        return cy.wrap({ jobID: result.id });
    });
});

Cypress.Commands.add('openTask', (taskName, projectSubsetFieldValue) => {
    cy.contains('strong', new RegExp(`^${taskName}$`))
        .parents('.cvat-tasks-list-item')
        .contains('a', 'Open').click({ force: true });
    cy.get('.cvat-spinner').should('not.exist');
    cy.get('.cvat-task-details').should('exist');
    if (projectSubsetFieldValue) {
        cy.get('.cvat-project-subset-field').find('input').should('have.attr', 'value', projectSubsetFieldValue);
    }
});

Cypress.Commands.add('saveJob', (method = 'PATCH', status = 200, as = 'saveJob') => {
    cy.intercept(method, '/api/jobs/**').as(as);
    cy.clickSaveAnnotationView();
    cy.wait(`@${as}`).its('response.statusCode').should('equal', status);
});

Cypress.Commands.add('getJobIDFromIdx', (jobIdx) => {
    const jobsKey = [];
    cy.document().then((doc) => {
        const jobs = Array.from(doc.querySelectorAll('.cvat-job-item'));
        for (let i = 0; i < jobs.length; i++) {
            jobsKey.push(+jobs[i].getAttribute('data-row-id'));
        }
        const minKey = Math.min(...jobsKey);
        return minKey + jobIdx;
    });
});

Cypress.Commands.add('openJobFromJobsPage', (jobID) => {
    cy.get('.cvat-header-jobs-button').click();
    cy.get('.cvat-jobs-page').should('exist').and('be.visible');
    cy.get('.cvat-job-page-list-item-id').contains(`ID: ${jobID}`)
        .prev()
        .should('not.have.class', 'cvat-job-item-loading-preview')
        .click();
    cy.get('.cvat-canvas-container').should('exist').and('be.visible');
});

Cypress.Commands.add('openJob', (jobIdx = 0, removeAnnotations = true, expectedFail = false) => {
    cy.get('.cvat-task-job-list').should('exist');
    cy.getJobIDFromIdx(jobIdx).then((jobID) => {
        cy.get('.cvat-job-item').contains('a', `Job #${jobID}`).click();
    });
    cy.url().should('include', '/jobs');
    if (expectedFail) {
        cy.get('.cvat-canvas-container').should('not.exist');
    } else {
        cy.get('.cvat-canvas-container').should('exist').and('be.visible');
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

Cypress.Commands.add('pressSplitControl', () => {
    cy.document().then((doc) => {
        const [el] = doc.getElementsByClassName('cvat-extra-controls-control');
        if (el) {
            cy.get('.cvat-extra-controls-control').click();
        }

        cy.get('.cvat-split-track-control').click();

        if (el) {
            cy.get('body').click();
        }
    });
});

Cypress.Commands.add('openTaskJob', (taskName, jobID = 0, removeAnnotations = true, expectedFail = false) => {
    cy.openTask(taskName);
    cy.openJob(jobID, removeAnnotations, expectedFail);
});

Cypress.Commands.add('interactControlButton', (objectType) => {
    cy.get('body').trigger('mousedown');
    cy.get(`.cvat-${objectType}-control`).click();
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
    cy.get('.cvat-canvas-container').click(createRectangleParams.firstX, createRectangleParams.firstY);
    cy.get('.cvat-canvas-container').click(createRectangleParams.secondX, createRectangleParams.secondY);
    if (createRectangleParams.points === 'By 4 Points') {
        cy.get('.cvat-canvas-container')
            .click(createRectangleParams.thirdX, createRectangleParams.thirdY);
        cy.get('.cvat-canvas-container')
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
            cy.get('.ant-input-number-input').clear();
            cy.get('.ant-input-number-input').type(createPointParams.numberOfPoints);
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
            .trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
        cy.get('.cvat-canvas-container')
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
        .click(createEllipseParams.firstX, createEllipseParams.firstY);
    cy.get('.cvat-canvas-container')
        .click(createEllipseParams.secondX, createEllipseParams.secondY);
    cy.checkPopoverHidden('draw-ellipse');
    cy.checkObjectParameters(createEllipseParams, 'ELLIPSE');
});

Cypress.Commands.add('createSkeleton', (skeletonParameters) => {
    cy.interactControlButton('draw-skeleton');
    cy.switchLabel(skeletonParameters.labelName, 'draw-skeleton');
    cy.get('.cvat-draw-skeleton-popover').within(() => {
        cy.get('.ant-select-selection-item').then(($labelValue) => {
            selectedValueGlobal = $labelValue.text();
        });
        cy.contains('button', skeletonParameters.type).click();
    });
    cy.get('.cvat-canvas-container')
        .click(skeletonParameters.xtl, skeletonParameters.ytl);
    cy.get('.cvat-canvas-container')
        .click(skeletonParameters.xbr, skeletonParameters.ybr);
    cy.checkPopoverHidden('draw-skeleton');
    cy.checkObjectParameters(skeletonParameters, 'SKELETON');
});

Cypress.Commands.add('changeAppearance', (colorBy) => {
    cy.get('.cvat-appearance-color-by-radio-group').within(() => {
        cy.get('[type="radio"]').check(colorBy, { force: true });
    });
});

Cypress.Commands.add('shapeGrouping', (firstX, firstY, lastX, lastY) => {
    const keyCodeG = 71;
    cy.get('.cvat-canvas-container')
        .trigger('keydown', { keyCode: keyCodeG, code: 'KeyG' });
    cy.get('.cvat-canvas-container')
        .trigger('keyup', { keyCode: keyCodeG, code: 'KeyG' });
    cy.get('.cvat-canvas-container')
        .trigger('mousedown', firstX, firstY, { which: 1 });
    cy.get('.cvat-canvas-container')
        .trigger('mousemove', lastX, lastY);
    cy.get('.cvat-canvas-container')
        .trigger('mouseup', lastX, lastY);
    cy.get('.cvat-canvas-container')
        .trigger('keydown', { keyCode: keyCodeG, code: 'KeyG' });
    cy.get('.cvat-canvas-container')
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
                cy.get('.ant-input-number-input').clear();
                cy.get('.ant-input-number-input').type(createPolygonParams.numberOfPoints);
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
            .trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
        cy.get('.cvat-canvas-container')
            .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
    }
    cy.checkPopoverHidden('draw-polygon');
    cy.checkObjectParameters(createPolygonParams, 'POLYGON');
});

Cypress.Commands.add('openSettings', () => {
    cy.get('.cvat-header-menu-user-dropdown').click();
    cy.get('.cvat-header-menu')
        .should('exist')
        .and('be.visible')
        .find('[role="menuitem"]')
        .filter(':contains("Settings")')
        .click();
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
                .first()
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

Cypress.Commands.add('updateAttributes', (attributes) => {
    const cvatAttributeInputsWrapperId = [];
    cy.get('.cvat-new-attribute-button').click();
    cy.document().then((doc) => {
        const cvatAttributeInputsWrapperList = Array.from(doc.querySelectorAll('.cvat-attribute-inputs-wrapper'));
        for (let i = 0; i < cvatAttributeInputsWrapperList.length; i++) {
            cvatAttributeInputsWrapperId.push(cvatAttributeInputsWrapperList[i].getAttribute('cvat-attribute-id'));
        }

        const minId = Math.min(...cvatAttributeInputsWrapperId);

        cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
            cy.get('.cvat-attribute-name-input').type(attributes.name);
            cy.get('.cvat-attribute-type-input').click();
        });
        cy.get('.ant-select-dropdown:has(.cvat-attribute-type-input-select)')
            .not('.ant-select-dropdown-hidden')
            .should('exist').and('be.visible')
            .first()
            .within(() => {
                cy.get(`.cvat-attribute-type-input-${attributes.type.toLowerCase()}`).click();
            });

        if (['Number', 'Text'].includes(attributes.type)) {
            cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
                if (attributes.values !== '') {
                    cy.get('.cvat-attribute-values-input').type(attributes.values);
                } else {
                    cy.get('.cvat-attribute-values-input').clear();
                }
            });
        } else if (['Radio', 'Select'].includes(attributes.type)) {
            cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
                cy.get('.cvat-attribute-values-input').type(`${attributes.values}{Enter}`);

                if (attributes.defaultValue) {
                    cy.get('.cvat-attribute-values-input').within(() => {
                        cy.get('.ant-tag').contains(attributes.defaultValue).click({ force: true });
                        cy.get('.ant-tag').should('have.class', 'ant-tag-blue');
                    });
                }
            });
        } else if (attributes.type === 'Checkbox') {
            cy.get(`[cvat-attribute-id="${minId}"]`).within(() => {
                cy.get('.cvat-attribute-values-input').click();
            });
            cy.get('.ant-select-dropdown')
                .not('.ant-select-dropdown-hidden')
                .first()
                .within(() => {
                    cy.get(`.ant-select-item-option[title="${attributes.values}"]`).click();
                });
        }
        if (attributes.mutable) {
            cy.get('.cvat-attribute-mutable-checkbox')
                .find('[type="checkbox"]')
                .should('not.be.checked')
                .check();
            cy.get('.cvat-attribute-mutable-checkbox')
                .find('[type="checkbox"]')
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
            cy.get('.ant-input-number-input').clear();
            cy.get('.ant-input-number-input').type(createPolylineParams.numberOfPoints);
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
            .trigger('keydown', { keyCode: keyCodeN, code: 'KeyN' });
        cy.get('.cvat-canvas-container')
            .trigger('keyup', { keyCode: keyCodeN, code: 'KeyN' });
    }
    cy.checkPopoverHidden('draw-polyline');
    cy.checkObjectParameters(createPolylineParams, 'POLYLINE');
});

Cypress.Commands.add('openTaskMenu', (taskName, fromTaskPage) => {
    if (fromTaskPage) {
        cy.contains('.cvat-text-color', 'Actions').click();
    } else {
        cy.contains('strong', taskName).parents('.cvat-tasks-list-item').find('.cvat-menu-icon').click();
    }
});

Cypress.Commands.add('clickInTaskMenu', (item, fromTaskPage, taskName = '') => {
    cy.openTaskMenu(taskName, fromTaskPage);
    cy.get('.ant-dropdown').not('.ant-dropdown-hidden').within(() => {
        cy.get('.cvat-actions-menu')
            .should('be.visible')
            .find('[role="menuitem"]')
            .filter(`:contains("${item}")`)
            .last()
            .click();
    });
});

Cypress.Commands.add('deleteTask', (taskName) => {
    let taskId = '';
    cy.contains('.cvat-item-task-name', new RegExp(`^${taskName}$`))
        .parents('.cvat-task-item-description')
        .find('.cvat-item-task-id')
        .then(($taskId) => {
            taskId = $taskId.text().replace(/[^\d]/g, '');
            cy.clickInTaskMenu('Delete', false, taskName);
            cy.get('.cvat-modal-confirm-delete-task')
                .should('contain', `The task ${taskId} will be deleted`)
                .within(() => {
                    cy.contains('button', 'Delete').click();
                });
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
    if (advancedConfigurationParams.sourceStorage) {
        const { sourceStorage } = advancedConfigurationParams;

        if (sourceStorage.disableSwitch) {
            cy.get('.ant-collapse-content-box').find('#useProjectSourceStorage').click();
        }

        cy.get('.cvat-select-source-storage').within(() => {
            cy.get('.ant-select-selection-item').click();
        });
        cy.contains('.cvat-select-source-storage-location', sourceStorage.location).should('be.visible').click();

        if (sourceStorage.cloudStorageId) {
            cy.get('.cvat-search-source-storage-cloud-storage-field').click();
            cy.get('.cvat-cloud-storage-select-provider').click();
        }
    }

    if (advancedConfigurationParams.targetStorage) {
        const { targetStorage } = advancedConfigurationParams;

        if (targetStorage.disableSwitch) {
            cy.get('.ant-collapse-content-box').find('#useProjectTargetStorage').click();
        }

        cy.get('.cvat-select-target-storage').within(() => {
            cy.get('.ant-select-selection-item').click();
        });
        cy.contains('.cvat-select-target-storage-location', targetStorage.location).should('be.visible').click();

        if (targetStorage.cloudStorageId) {
            cy.get('.cvat-search-target-storage-cloud-storage-field').click();
            cy.get('.cvat-cloud-storage-select-provider').last().click();
        }
    }
});

Cypress.Commands.add('configureTaskQualityMode', (qualityConfigurationParams) => {
    cy.contains('Quality').click();
    if (qualityConfigurationParams.validationMode) {
        cy.get('#validationMode').within(() => {
            cy.contains(qualityConfigurationParams.validationMode).click();
        });
    }
    if (qualityConfigurationParams.validationFramesPercent) {
        cy.get('#validationFramesPercent').clear();
        cy.get('#validationFramesPercent').type(qualityConfigurationParams.validationFramesPercent);
    }
    if (qualityConfigurationParams.validationFramesPerJobPercent) {
        cy.get('#validationFramesPerJobPercent').clear();
        cy.get('#validationFramesPerJobPercent').type(qualityConfigurationParams.validationFramesPerJobPercent);
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

Cypress.Commands.add('confirmUpdate', (modalWindowClassName) => {
    cy.get(modalWindowClassName).should('be.visible').within(() => {
        cy.contains('button', 'Update').click();
    });
});

Cypress.Commands.add(
    'uploadAnnotations', ({
        format, filePath, confirmModalClassName,
        sourceStorage = null, useDefaultLocation = true, waitAnnotationsGet = true,
        expectedResult = 'success',
    },
    ) => {
        cy.get('.cvat-modal-import-dataset').find('.cvat-modal-import-select').click();
        cy.contains('.cvat-modal-import-dataset-option-item', format).click();
        cy.get('.cvat-modal-import-select').should('contain.text', format);

        if (!useDefaultLocation) {
            cy.get('.cvat-modal-import-dataset')
                .find('.cvat-modal-import-switch-use-default-storage')
                .click();
            cy.get('.cvat-select-source-storage').within(() => {
                cy.get('.ant-select-selection-item').click();
            });
            cy.contains('.cvat-select-source-storage-location', sourceStorage.location)
                .should('be.visible')
                .click();
            if (sourceStorage.cloudStorageId) {
                cy.get('.cvat-search-source-storage-cloud-storage-field').click();
                cy.get('.cvat-cloud-storage-select-provider').click();
            }
        }
        if (sourceStorage && sourceStorage.cloudStorageId) {
            cy.get('.cvat-modal-import-dataset')
                .find('.cvat-modal-import-filename-input')
                .type(filePath);
        } else {
            cy.get('input[type="file"]').attachFile(filePath, { subjectType: 'drag-n-drop' });
            cy.get(`[title="${filePath.split('/').pop()}"]`).should('be.visible');
        }
        cy.contains('button', 'OK').click();
        cy.confirmUpdate(confirmModalClassName);
        cy.get('.cvat-notification-notice-import-annotation-start').should('be.visible');
        cy.closeNotification('.cvat-notification-notice-import-annotation-start');
        if (waitAnnotationsGet) {
            cy.wait('@uploadAnnotationsGet').its('response.statusCode').should('equal', 200);
        }
        if (expectedResult === 'success') {
            cy.contains('Annotations have been loaded').should('be.visible');
            cy.closeNotification('.ant-notification-notice-info');
        } else if (expectedResult === 'fail') {
            cy.contains('Could not upload annotation').should('be.visible');
            cy.closeNotification('.ant-notification-notice-error');
        }
    },
);

Cypress.Commands.add('goToTaskList', () => {
    cy.get('a[value="tasks"]').click();
    cy.url().should('include', '/tasks');
});

Cypress.Commands.add('changeColorViaBadge', (labelColor) => {
    cy.get('.cvat-label-color-picker')
        .not('.ant-popover-hidden')
        .should('be.visible')
        .first()
        .within(() => {
            cy.contains('hex').prev().clear();
            cy.contains('hex').prev().type(labelColor);
            cy.contains('button', 'Ok').click();
        });
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
    cy.intercept('DELETE', '/api/labels/*').as('deleteLabel');
    cy.get('.cvat-modal-delete-label')
        .should('be.visible')
        .first()
        .within(() => {
            cy.contains('[type="button"]', 'OK').click();
        });
    cy.wait('@deleteLabel').its('response.statusCode').should('equal', 204);
    cy.contains('.cvat-constructor-viewer-item', new RegExp(`^${labelName}$`)).should('not.exist');
});

Cypress.Commands.add('addNewLabel', ({ name, color }, additionalAttrs) => {
    cy.collectLabelsName().then((labelsNames) => {
        if (labelsNames.includes(name)) {
            cy.deleteLabel(name);
        }
    });
    cy.contains('button', 'Add label').click();
    cy.get('[placeholder="Label name"]').type(name);
    if (color) {
        cy.get('.cvat-change-task-label-color-badge').click();
        cy.changeColorViaBadge(color);
        cy.get('.cvat-label-color-picker').should('be.hidden');
    }
    if (additionalAttrs) {
        for (let i = 0; i < additionalAttrs.length; i++) {
            cy.updateAttributes(additionalAttrs[i]);
        }
    }
    cy.contains('button', 'Continue').click();
    cy.contains('button', 'Cancel').click();
    cy.get('.cvat-spinner').should('not.exist');
    cy.get('.cvat-constructor-viewer').should('be.visible');
    cy.contains('.cvat-constructor-viewer-item', new RegExp(`^${name}$`)).should('exist');
});

Cypress.Commands.add('addNewSkeletonLabel', ({ name, points }) => {
    cy.get('.cvat-constructor-viewer-new-skeleton-item').click();
    cy.get('.cvat-skeleton-configurator').should('exist').and('be.visible');

    cy.get('.cvat-label-constructor-creator').within(() => {
        cy.get('#name').type(name);
        cy.get('.ant-radio-button-checked').within(() => {
            cy.get('.ant-radio-button-input').should('have.attr', 'value', 'point');
        });
    });

    cy.get('.cvat-skeleton-configurator-svg').then(($canvas) => {
        const canvas = $canvas[0];
        canvas.scrollIntoView();
        const rect = canvas.getBoundingClientRect();
        const { width, height } = rect;
        points.forEach(({ x: xOffset, y: yOffset }) => {
            canvas.dispatchEvent(new MouseEvent('mousedown', {
                clientX: rect.x + width * xOffset,
                clientY: rect.y + height * yOffset,
                button: 0,
                bubbles: true,
            }));
        });

        cy.get('.ant-radio-button-wrapper:nth-child(3)').click();
        cy.get('.ant-radio-button-wrapper:nth-child(3)').within(() => {
            cy.get('.ant-radio-button-input').should('have.attr', 'value', 'join');
        });

        cy.get('.cvat-skeleton-configurator-svg').within(() => {
            cy.get('circle').then(($circles) => {
                expect($circles.length).to.be.equal(5);
                $circles.each(function (i) {
                    const circle1 = this;
                    $circles.each(function (j) {
                        const circle2 = this;
                        if (i === j) return;
                        circle1.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                        circle1.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }));
                        circle1.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

                        circle2.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                        circle2.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }));
                        circle2.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
                    });
                });
            });
        });

        cy.contains('Continue').scrollIntoView();
        cy.contains('Continue').click();
        cy.contains('Cancel').click();
    });
});

Cypress.Commands.add('checkCanvasSidebarColorEqualness', (id) => {
    cy.get(`#cvat-objects-sidebar-state-item-${id}`).then(($el) => {
        const labelColor = $el.css('backgroundColor');
        const [r, g, b] = labelColor.match(/(\d+)/g);
        const hexColor = `#${[r, g, b].map((v) => (+v).toString(16).padStart(2, '0')).join('')}`;
        cy.get(`#cvat_canvas_shape_${id}`).should('have.attr', 'fill', hexColor);
    });
});

Cypress.Commands.add('addNewLabelViaContinueButton', (additionalLabels) => {
    cy.collectLabelsName().then((labelsNames) => {
        if (additionalLabels.some((el) => labelsNames.indexOf(el) === -1)) {
            cy.get('.cvat-constructor-viewer-new-item').click();
            for (let j = 0; j < additionalLabels.length; j++) {
                cy.get('[placeholder="Label name"]').type(additionalLabels[j]);
                cy.contains('button', 'Continue').click();
                cy.contains('button', 'Continue').trigger('mouseout');
            }
            cy.contains('button', 'Cancel').click();
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
        cy.get('input[role="spinbutton"]').clear({ force: true });
        cy.get('input[role="spinbutton"]').type(`${frameNum}{Enter}`, { force: true });
        cy.get('input[role="spinbutton"]').should('have.value', frameNum);
    });
});

Cypress.Commands.add('checkFrameNum', (frameNum) => {
    cy.get('.cvat-player-frame-selector').within(() => {
        cy.get('input[role="spinbutton"]').should('have.value', frameNum);
    });
});

Cypress.Commands.add('goToNextFrame', (expectedFrameNum) => {
    cy.get('.cvat-player-next-button').click();
    cy.get('.cvat-player-next-button').trigger('mouseout');
    cy.checkFrameNum(expectedFrameNum);
});

Cypress.Commands.add('goToPreviousFrame', (expectedFrameNum) => {
    cy.get('.cvat-player-previous-button').click();
    cy.get('.cvat-player-previous-button').trigger('mouseout');
    cy.checkFrameNum(expectedFrameNum);
});

Cypress.Commands.add('interactMenu', (choice) => {
    cy.contains('.cvat-annotation-header-button', 'Menu').click();
    cy.get('.cvat-annotation-menu').within(() => {
        cy.contains(new RegExp(`^${choice}$`)).click();
    });
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('updateJobStateOnAnnotationView', (choice) => {
    cy.interactMenu('Change job state');
    cy.get('.cvat-annotation-menu-job-state-submenu')
        .should('not.have.class', 'ant-zoom-big').within(() => {
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

Cypress.Commands.add('setJobState', (jobID, state) => {
    cy.get('.cvat-task-job-list')
        .contains('a', `Job #${jobID}`)
        .parents('.cvat-job-item')
        .find('.cvat-job-item-state').click();
    cy.get('.cvat-job-item-state-dropdown')
        .should('be.visible')
        .not('.ant-select-dropdown-hidden')
        .within(() => {
            cy.get(`[title="${state}"]`).click();
        });
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('setJobStage', (jobID, stage) => {
    cy.get('.cvat-task-job-list')
        .contains('a', `Job #${jobID}`)
        .parents('.cvat-job-item')
        .find('.cvat-job-item-stage').click();
    cy.get('.cvat-job-item-stage-dropdown')
        .should('be.visible')
        .not('.ant-select-dropdown-hidden')
        .within(() => {
            cy.get(`[title="${stage}"]`).click();
        });
    cy.get('.cvat-spinner').should('not.exist');
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
    if (Cypress.browser.family !== 'chromium' && !window.localStorage.getItem('platformNotiticationShown')) {
        cy.get('.cvat-modal-unsupported-platform-warning').within(() => {
            cy.contains('button', 'OK').click();
        });
    }
});

Cypress.Commands.add('exportTask', ({
    type, format, archiveCustomName,
    targetStorage = null, useDefaultLocation = true,
}) => {
    cy.clickInTaskMenu('Export task dataset', true);
    cy.get('.cvat-modal-export-task').should('be.visible').find('.cvat-modal-export-select').click();
    cy.contains('.cvat-modal-export-option-item', format).should('be.visible').click();
    cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').should('contain.text', format);
    if (type === 'dataset') {
        cy.get('.cvat-modal-export-task').find('.cvat-modal-export-save-images').should('not.be.checked').click();
    }
    if (archiveCustomName) {
        cy.get('.cvat-modal-export-task').find('.cvat-modal-export-filename-input').type(archiveCustomName);
    }
    if (!useDefaultLocation) {
        cy.get('.cvat-modal-export-task').find('.cvat-settings-switch').click();
        cy.get('.cvat-select-target-storage').within(() => {
            cy.get('.ant-select-selection-item').click();
        });
        cy.contains('.cvat-select-target-storage-location', targetStorage.location).should('be.visible').click();

        if (targetStorage.cloudStorageId) {
            cy.get('.cvat-search-target-storage-cloud-storage-field').click();
            cy.get('.cvat-cloud-storage-select-provider').click();
        }
    }
    cy.contains('.cvat-modal-export-task button', 'OK').click();
    cy.get('.cvat-notification-notice-export-task-start').should('be.visible');
    cy.closeNotification('.cvat-notification-notice-export-task-start');
});

Cypress.Commands.add('exportJob', ({
    type, format, archiveCustomName,
    targetStorage = null, useDefaultLocation = true, jobOnTaskPage = null,
}) => {
    if (!jobOnTaskPage) {
        cy.interactMenu('Export job dataset');
    } else {
        cy.get('.cvat-job-item').contains('a', `Job #${jobOnTaskPage}`)
            .parents('.cvat-job-item')
            .find('.cvat-job-item-more-button')
            .click();
        cy.contains('Export annotations').click();
    }
    cy.get('.cvat-modal-export-job').should('be.visible').find('.cvat-modal-export-select').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .not('.ant-slide-up')
        .within(() => {
            cy.contains('.cvat-modal-export-option-item', format).scrollIntoView();
        });
    cy.contains('.cvat-modal-export-option-item', format).should('be.visible').click();
    cy.get('.cvat-modal-export-job').find('.cvat-modal-export-select').should('contain.text', format);
    if (type === 'dataset') {
        cy.get('.cvat-modal-export-job').find('.cvat-modal-export-save-images').should('not.be.checked').click();
    }
    if (archiveCustomName) {
        cy.get('.cvat-modal-export-job').find('.cvat-modal-export-filename-input').type(archiveCustomName);
    }
    if (!useDefaultLocation) {
        cy.get('.cvat-modal-export-job').find('.cvat-settings-switch').click();
        cy.get('.cvat-select-target-storage').within(() => {
            cy.get('.ant-select-selection-item').click();
        });
        cy.contains('.cvat-select-target-storage-location', targetStorage.location).should('be.visible').click();

        if (targetStorage.cloudStorageId) {
            cy.get('.cvat-search-target-storage-cloud-storage-field').click();
            cy.get('.cvat-cloud-storage-select-provider').click();
        }
    }
    cy.get('.cvat-modal-export-job').contains('button', 'OK').click();
    cy.get('.cvat-notification-notice-export-job-start').should('be.visible');
    cy.closeNotification('.cvat-notification-notice-export-job-start');
});

Cypress.Commands.add('downloadExport', ({ expectNotification = true } = {}) => {
    if (expectNotification) {
        cy.verifyNotification();
    }
    cy.get('.cvat-header-requests-button').click();
    cy.get('.cvat-spinner').should('not.exist');
    cy.get('.cvat-requests-list').should('be.visible');
    cy.get('.cvat-requests-card').first().within(() => {
        cy.get('.cvat-requests-page-actions-button').click();
    });
    cy.intercept('GET', '**=download').as('download');
    cy.get('.ant-dropdown')
        .not('.ant-dropdown-hidden')
        .within(() => {
            cy.contains('[role="menuitem"]', 'Download').click();
        });
    cy.wait('@download', { requestTimeout: 10000 })
        .then((download) => {
            const filename = download.response.headers['content-disposition'].split(';')[1].split('filename=')[1];
            // need to remove quotes
            return filename.substring(1, filename.length - 1);
        });
});

Cypress.Commands.add('goBack', () => {
    cy.go('back');
    cy.get('.cvat-spinner').should('not.exist');
});

Cypress.Commands.add('renameTask', (oldName, newName) => {
    cy.get('.cvat-task-details-task-name').within(() => {
        cy.get('[aria-label="edit"]').click();
    });
    cy.contains('.cvat-text-color', oldName).type(`{selectall}{backspace}${newName}{Enter}`);
    cy.get('.cvat-spinner').should('not.exist');
    cy.contains('.cvat-task-details-task-name', newName).should('exist');
});

Cypress.Commands.add('shapeRotate', (shape, expectedRotateDeg, pressShift = false) => {
    cy.get(shape).trigger('mousemove');
    cy.get(shape).trigger('mouseover');
    cy.get(shape).should('have.class', 'cvat_canvas_shape_activated');
    cy.get('.svg_select_points_rot').then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        let { x, y } = rect;
        const { width, height } = rect;
        x += width / 2;
        y += height / 2;

        cy.get('#root').trigger('mousemove', x, y);
        cy.get('#root').trigger('mouseenter', x, y);
        cy.get('.svg_select_points_rot').should('have.class', 'cvat_canvas_selected_point');
        cy.get('#root').trigger('mousedown', x, y, { button: 0 });
        if (pressShift) {
            cy.get('body').type('{shift}', { release: false });
        }
        cy.get('#root').trigger('mousemove', x + 20, y);
        cy.get(shape).should('have.attr', 'transform');
        cy.document().then((doc) => {
            const modShapeIDString = shape.substring(1); // Remove "#" from the shape id string
            const shapeTranformMatrix = decomposeMatrix(doc.getElementById(modShapeIDString).getCTM());
            cy.get('#cvat_canvas_text_content').should('contain.text', `${shapeTranformMatrix}°`);
            expect(`${shapeTranformMatrix}°`).to.be.equal(`${expectedRotateDeg}°`);
        });
        cy.get('#root').trigger('mouseup');
    });
});

Cypress.Commands.add('deleteFrame', (action = 'delete') => {
    cy.intercept('PATCH', '/api/jobs/**/data/meta**').as('patchMeta');
    if (action === 'restore') {
        cy.get('.cvat-player-restore-frame').click();
    } else if (action === 'delete') {
        cy.clickDeleteFrameAnnotationView();
    }
    cy.saveJob('PATCH', 200);
    cy.wait('@patchMeta').its('response.statusCode').should('equal', 200);
});

Cypress.Commands.add('verifyNotification', () => {
    cy.get('.ant-notification-notice-info').should('be.visible');
    cy.closeNotification('.ant-notification-notice-info');
});

Cypress.Commands.add('goToCloudStoragesPage', () => {
    cy.get('a[value="cloudstorages"]').click();
    cy.url().should('include', '/cloudstorages');
});

Cypress.Commands.add('deleteCloudStorage', (displayName) => {
    cy.get('.cvat-cloud-storage-item-menu-button').click();
    cy.get('.ant-dropdown')
        .not('.ant-dropdown-hidden')
        .within(() => {
            cy.contains('[role="menuitem"]', 'Delete').click();
        });
    cy.get('.cvat-delete-cloud-storage-modal')
        .should('contain', `You are going to remove the cloudstorage "${displayName}"`)
        .within(() => {
            cy.contains('button', 'Delete').click();
        });
});

Cypress.Commands.add('createJob', (options = {
    jobType: 'Ground truth',
    frameSelectionMethod: 'Random',
    quantity: null,
    frameCount: null,
    seed: null,
    fromTaskPage: true,
}) => {
    const {
        jobType,
        frameSelectionMethod,
        quantity,
        frameCount,
        seed,
        fromTaskPage,
    } = options;

    if (fromTaskPage) {
        cy.get('.cvat-create-job').click({ force: true });
    }
    cy.url().should('include', '/jobs/create');

    cy.get('.cvat-select-job-type').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .first()
        .within(() => {
            cy.get(`.ant-select-item-option[title="${jobType}"]`).click();
        });

    cy.get('.cvat-select-frame-selection-method').click();
    cy.get('.ant-select-dropdown')
        .not('.ant-select-dropdown-hidden')
        .first()
        .within(() => {
            cy.get(`.ant-select-item-option[title="${frameSelectionMethod}"]`).click();
        });

    if (quantity) {
        cy.get('.cvat-input-frame-quantity').clear();
        cy.get('.cvat-input-frame-quantity').type(quantity);
    } else if (frameCount) {
        cy.get('.cvat-input-frame-count').clear();
        cy.get('.cvat-input-frame-count').type(frameCount);
    }

    if (seed) {
        cy.get('.cvat-input-seed').clear();
        cy.get('.cvat-input-seed').type(seed);
    }

    cy.contains('button', 'Submit').click();

    cy.get('.cvat-spinner').should('not.exist');
    cy.url().should('match', /\/tasks\/\d+\/jobs\/\d+/);
});

Cypress.Commands.add('deleteJob', (jobID) => {
    cy.get('.cvat-job-item').contains('a', `Job #${jobID}`)
        .parents('.cvat-job-item')
        .find('.cvat-job-item-more-button')
        .click();
    cy.get('.ant-dropdown')
        .not('.ant-dropdown-hidden')
        .within(() => {
            cy.contains('[role="menuitem"]', 'Delete').click();
        });
    cy.get('.cvat-modal-confirm-delete-job')
        .should('contain', `The job ${jobID} will be deleted`)
        .within(() => {
            cy.contains('button', 'Delete').click();
        });
    cy.get('.cvat-job-item').contains('a', `Job #${jobID}`)
        .parents('.cvat-job-item')
        .should('have.css', 'opacity', '0.5');
});

Cypress.Commands.add('drawMask', (instructions) => {
    for (const instruction of instructions) {
        const { method } = instruction;
        if (method === 'brush-size') {
            const { value } = instruction;
            cy.get('.cvat-brush-tools-brush').click();
            cy.get('.cvat-brush-tools-brush-size').within(() => {
                cy.get('input').clear();
                cy.get('input').type(`${value}`);
            });
        } else {
            const { coordinates } = instruction;
            if (['brush', 'eraser'].includes(method)) {
                if (method === 'eraser') {
                    cy.get('.cvat-brush-tools-eraser').click();
                } else {
                    cy.get('.cvat-brush-tools-brush').click();
                }

                cy.get('.cvat-canvas-container').then(([$canvas]) => {
                    const [initX, initY] = coordinates[0];
                    cy.wrap($canvas).trigger('mousemove', { clientX: initX, clientY: initY, bubbles: true });
                    cy.wrap($canvas).trigger('mousedown', {
                        clientX: initX, clientY: initY, button: 0, bubbles: true,
                    });
                    for (const coord of coordinates) {
                        const [clientX, clientY] = coord;
                        cy.wrap($canvas).trigger('mousemove', { clientX, clientY, bubbles: true });
                    }
                    cy.wrap($canvas).trigger('mousemove', { clientX: initX, clientY: initY, bubbles: true });
                    cy.wrap($canvas).trigger('mouseup', { bubbles: true });
                });
            } else if (['polygon-plus', 'polygon-minus'].includes(method)) {
                if (method === 'polygon-plus') {
                    cy.get('.cvat-brush-tools-polygon-plus').click();
                } else {
                    cy.get('.cvat-brush-tools-polygon-minus').click();
                }

                cy.get('.cvat-canvas-container').then(($canvas) => {
                    for (const [x, y] of coordinates) {
                        cy.wrap($canvas).click(x, y);
                    }
                });
            }
        }
    }
});

Cypress.Commands.add('startMaskDrawing', () => {
    cy.get('.cvat-draw-mask-control ').click();
    cy.get('.cvat-draw-mask-popover').should('exist').and('be.visible').within(() => {
        cy.get('button').click();
    });
    cy.get('.cvat-brush-tools-toolbox').should('exist').and('be.visible');
});

Cypress.Commands.add('finishMaskDrawing', () => {
    cy.get('.cvat-brush-tools-brush').click();
    cy.get('.cvat-brush-tools-finish').click();
    cy.hideTooltips();
});

Cypress.Commands.add('sliceShape', (
    object,
    coordinates,
    options = {
        shortcut: null,
        slipMode: false,
    },
) => {
    const { shortcut, slipMode } = options;
    if (shortcut) {
        cy.get('body').type(shortcut);
    } else {
        cy.get('.cvat-slice-control').click();
        cy.get('.cvat-slice-control').trigger('mouseleave');
    }

    cy.get('.cvat-canvas-hints-container').within(() => {
        cy.contains('Click a mask or polygon shape you would like to slice').should('exist');
    });

    const [initialX, initialY] = coordinates.shift();
    cy.get(object).click(initialX, initialY);
    cy.get('.cvat-canvas-hints-container').within(() => {
        cy.contains('Set initial point on the shape contour').should('exist');
    });

    cy.get('.cvat-canvas-container').then(($canvas) => {
        if (slipMode) {
            const [initX, initY] = coordinates.shift();
            cy.wrap($canvas).click(initX, initY);
            const [endX, endY] = coordinates.pop();

            for (const [x, y] of coordinates) {
                cy.wrap($canvas).trigger('mousemove', x, y, { button: 0, shiftKey: true, bubbles: true });
            }
            cy.wrap($canvas).click(endX, endY);
        } else {
            for (const [x, y] of coordinates) {
                cy.wrap($canvas).click(x, y);
            }
        }
    });
});

Cypress.Commands.add('joinShapes', (
    objects,
    coordinates,
    options = {
        shortcut: null,
    },
) => {
    const { shortcut } = options;

    const interactWithTool = () => {
        if (shortcut) {
            cy.get('body').type(shortcut);
        } else {
            cy.get('.cvat-join-control').click();
            cy.get('.cvat-join-control').trigger('mouseleave');
        }
    };
    interactWithTool();

    cy.get('.cvat-canvas-hints-container').within(() => {
        cy.contains('Click masks you would like to join').should('exist');
    });

    for (const [index, object] of objects.entries()) {
        cy.get(object).click(coordinates[index][0], coordinates[index][1]);
    }
    interactWithTool();
});

Cypress.Commands.add('interactAnnotationObjectMenu', (parentSelector, button) => {
    cy.get(parentSelector).within(() => {
        cy.get('[aria-label="more"]').click();
    });

    cy.document().find('.cvat-object-item-menu').within(() => {
        cy.contains('button', button).click();
    });
});

Cypress.Commands.add('hideTooltips', () => {
    cy.wait(500); // wait while tooltips are opened

    cy.document().then((doc) => {
        const tooltips = Array.from(doc.querySelectorAll('.ant-tooltip'));
        if (tooltips.length > 0) {
            cy.get('.ant-tooltip').invoke('hide');
        }
    });
});

Cypress.Commands.add('checkDeletedFrameVisibility', () => {
    cy.openSettings();
    cy.get('.cvat-workspace-settings-show-deleted').within(() => {
        cy.get('[type="checkbox"]').should('not.be.checked').check();
    });
    cy.closeSettings();
});

Cypress.Commands.add('checkCsvFileContent', (expectedFileName, header, rowsCount, checkRow = null) => {
    const downloadsFolder = Cypress.config('downloadsFolder');
    const filePath = `${downloadsFolder}/${expectedFileName}`;
    cy.readFile(filePath).then((csv) => {
        const rows = csv.split('\n');
        expect(rows.length).to.equal(rowsCount);
        expect(rows[0]).to.include(header);
        if (checkRow) {
            rows.slice(1).forEach(checkRow);
        }
    });
});

Cypress.Commands.overwrite('visit', (orig, url, options) => {
    orig(url, options);
    cy.closeModalUnsupportedPlatform();
});

Cypress.Commands.overwrite('reload', (orig, options) => {
    orig(options);
    cy.closeModalUnsupportedPlatform();
});

Cypress.Commands.add('clickDeleteFrameAnnotationView', () => {
    cy.get('.cvat-player-delete-frame').click();
    cy.get('.cvat-modal-delete-frame').within(() => {
        cy.contains('button', 'Delete').click();
    });
});

Cypress.Commands.add('clickSaveAnnotationView', () => {
    cy.get('button').contains('Save').click();
    cy.get('button').contains('Save').trigger('mouseout');
});
