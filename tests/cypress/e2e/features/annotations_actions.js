// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Testing annotations actions workflow', () => {
    let taskID = null;
    let jobID = null;
    let labels = [];

    const latestFrameNumber = 11;
    const frames = Array(latestFrameNumber + 1).fill(0).map((_, idx) => idx);

    const taskPayload = {
        name: 'Test annotations actions',
        labels: [{
            name: 'label 1',
            attributes: [],
            type: 'any',
        }, {
            name: 'label 2',
            attributes: [],
            type: 'any',
        }],
        project_id: null,
        source_storage: { location: 'local' },
        target_storage: { location: 'local' },
    };

    const dataPayload = {
        server_files: ['archive.zip'],
        image_quality: 70,
        use_zip_chunks: true,
        use_cache: true,
        sorting_method: 'lexicographical',
    };

    before(() => {
        cy.visit('auth/login');
        cy.login();

        cy.headlessCreateTask(taskPayload, dataPayload).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;

            cy.intercept(`/api/labels?**job_id=${jobID}**`).as('getJobLabels');
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.wait('@getJobLabels').then((interception) => {
                labels = interception.response.body.results;
            });
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    describe('Basic actions on the modal window', () => {
        beforeEach(() => {
            cy.goCheckFrameNumber(0);
        });

        it('Open actions modals, check buttons', () => {
            const middleFrame = Math.round(latestFrameNumber / 2);
            cy.goCheckFrameNumber(middleFrame);

            cy.openAnnotationsActionsModal();
            cy.get('.cvat-action-runner-info').should('exist').and('be.visible');
            cy.get('.cvat-action-runner-list').should('exist').and('be.visible');
            cy.get('.cvat-action-runner-frames').should('exist').and('be.visible');
            cy.get('.cvat-action-runner-frames-predefined').should('exist').and('be.visible');
            cy.get('.cvat-action-runner-buttons').should('exist').and('be.visible');

            const buttonFrames = {
                'Current frame': [middleFrame, middleFrame],
                'All frames': [0, latestFrameNumber],
                'From current': [middleFrame, latestFrameNumber],
                'Up to current': [0, middleFrame],
            };

            for (const [button, [frameFrom, frameTo]] of Object.entries(buttonFrames)) {
                cy.get('.cvat-action-runner-frames-predefined button').contains(button).click();
                cy.get('.cvat-action-runner-frames .ant-input-number input')
                    .first().should('have.value', frameFrom);
                cy.get('.cvat-action-runner-frames .ant-input-number input')
                    .last().should('have.value', frameTo);
            }

            cy.closeAnnotationsActionsModal();
        });

        it('Recommendation to save the job appears if there are unsaved changes', () => {
            cy.createRectangle({
                points: 'By 2 Points',
                type: 'Shape',
                labelName: taskPayload.labels[0].name,
                firstX: 250,
                firstY: 350,
                secondX: 350,
                secondY: 450,
            });

            cy.openAnnotationsActionsModal();
            cy.intercept(`/api/jobs/${jobID}/annotations?**action=create**`).as('createAnnotationsRequest');
            cy.get('.cvat-action-runner-save-job-recommendation').should('exist').and('be.visible').click();
            cy.wait('@createAnnotationsRequest').its('response.statusCode').should('equal', 200);
            cy.get('.cvat-action-runner-save-job-recommendation').should('not.exist');

            cy.closeAnnotationsActionsModal();
        });

        it('Recommendation to disable automatic saving appears in modal if automatic saving is enabled', () => {
            cy.openSettings();
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-auto-save').within(() => {
                cy.get('[type="checkbox"]').check();
            });
            cy.closeSettings();

            cy.openAnnotationsActionsModal();
            cy.get('.cvat-action-runner-disable-autosave-recommendation').should('exist').and('be.visible').click();
            cy.get('.cvat-action-runner-disable-autosave-recommendation').should('not.exist');
            cy.closeAnnotationsActionsModal();

            cy.openSettings();
            cy.contains('Workspace').click();
            cy.get('.cvat-workspace-settings-auto-save').within(() => {
                cy.get('[type="checkbox"]').should('not.be.checked');
            });
            cy.closeSettings();
        });
    });

    describe('Test action: "Remove filtered shapes"', () => {
        const ACTION_NAME = 'Remove filtered shapes';

        before(() => {
            const shapes = frames.map((frame) => [{
                type: 'rectangle',
                occluded: false,
                outside: false,
                z_order: 0,
                points: [250, 350, 350, 450],
                rotation: 0,
                attributes: [],
                elements: [],
                frame,
                label_id: labels[0].id,
                group: 0,
                source: 'manual',
            }, {
                type: 'rectangle',
                occluded: false,
                outside: false,
                z_order: 0,
                points: [350, 450, 450, 550],
                rotation: 0,
                attributes: [],
                elements: [],
                frame,
                label_id: labels[1].id,
                group: 0,
                source: 'manual',
            }]).flat();

            const tracks = [{
                label_id: labels[0].id,
                frame: 0,
                group: 0,
                source: 'manual',
                attributes: [],
                elements: [],
                shapes: [{
                    type: 'rectangle',
                    occluded: false,
                    z_order: 0,
                    rotation: 0,
                    outside: false,
                    attributes: [],
                    frame: 0,
                    points: [250, 350, 350, 450],
                }],
            }];

            const tags = frames.map((frame) => [{
                frame,
                label_id: labels[0].id,
                source: 'manual',
                group: 0,
                attributes: [],
            }, {
                frame,
                label_id: labels[1].id,
                source: 'manual',
                group: 0,
                attributes: [],
            }]).flat();

            cy.window().then((window) => {
                window.cvat.server.request(`/api/jobs/${jobID}/annotations`, {
                    method: 'PUT',
                    data: { shapes, tracks, tags },
                });
            });
        });

        beforeEach(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('not.exist');
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });

        it('Apply and cancel action, check buttons state and text', () => {
            cy.openAnnotationsActionsModal();
            cy.selectAnnotationsAction(ACTION_NAME);
            cy.runAnnotationsAction();
            cy.cancelAnnotationsAction();
            cy.closeAnnotationsActionsModal();
        });

        it('Apply action on specific frames, tracks and tags are not affected', () => {
            const middleFrame = Math.round(latestFrameNumber / 2);
            cy.goCheckFrameNumber(middleFrame);

            cy.openAnnotationsActionsModal();
            cy.selectAnnotationsAction(ACTION_NAME);
            cy.get('.cvat-action-runner-frames-predefined button').contains('From current').click();
            cy.runAnnotationsAction();
            cy.waitAnnotationsAction();
            cy.closeAnnotationsActionsModal();

            frames.forEach((frame) => {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat-frame-tag').should('have.length', 2);

                if (frame >= middleFrame) {
                    cy.get('.cvat_canvas_shape').should('have.length', 1); // only track
                } else {
                    cy.get('.cvat_canvas_shape').should('have.length', 3); // one track and two shapes
                }
            });
        });

        it('Apply action on filtered objects, unfiltered objects are not affected', () => {
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Label',
                operator: '==',
                value: labels[0].name,
                submit: true,
            });

            cy.openAnnotationsActionsModal();
            cy.selectAnnotationsAction(ACTION_NAME);
            cy.runAnnotationsAction();
            cy.waitAnnotationsAction();
            cy.closeAnnotationsActionsModal();

            cy.clearFilters();
            cy.addFiltersRule(0);
            cy.setFilter({
                groupIndex: 0,
                ruleIndex: 0,
                field: 'Type',
                operator: '==',
                value: 'Shape',
                submit: true,
            });

            frames.forEach((frame) => {
                cy.goCheckFrameNumber(frame);
                cy.get('.cvat_canvas_shape').should('have.length', 1);
            });
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            if (taskID) {
                cy.request({
                    method: 'DELETE',
                    url: `/api/tasks/${taskID}`,
                    headers: {
                        Authorization: `Token ${authKey}`,
                    },
                });
            }
        });
    });
});
