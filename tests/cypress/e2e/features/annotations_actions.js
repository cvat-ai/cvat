// Copyright (C) CVAT.ai Corporation
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
        cy.visit('/auth/login');
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

    describe('Test action: "Propagate shapes"', () => {
        const ACTION_NAME = 'Propagate shapes';
        const FORMAT_NAME = 'Segmentation mask 1.1';

        function checkFramesContainShapes(from, to, amount) {
            frames.forEach((frame) => {
                cy.goCheckFrameNumber(frame);

                if (frame >= from && frame <= to) {
                    cy.get('.cvat_canvas_shape').should('have.length', amount);
                } else {
                    cy.get('.cvat_canvas_shape').should('have.length', 0);
                }
            });
        }

        before(() => {
            const shapes = [{
                type: 'rectangle',
                occluded: false,
                outside: false,
                z_order: 0,
                points: [250, 350, 350, 450],
                rotation: 0,
                attributes: [],
                elements: [],
                frame: 0,
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
                frame: 0,
                label_id: labels[1].id,
                group: 0,
                source: 'manual',
            }];

            cy.window().then((window) => {
                window.cvat.server.request(`/api/jobs/${jobID}/annotations`, {
                    method: 'PUT',
                    data: { shapes },
                });
            });
        });

        beforeEach(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('not.exist');
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });

        it('Apply action on specific frames', () => {
            const middleFrame = Math.round(latestFrameNumber / 2);
            cy.openAnnotationsActionsModal();
            cy.selectAnnotationsAction(ACTION_NAME);
            cy.setAnnotationActionParameter('Target frame', 'input', middleFrame);
            cy.runAnnotationsAction();
            cy.waitAnnotationsAction();
            cy.closeAnnotationsActionsModal();
            checkFramesContainShapes(0, middleFrame, 2);
        });

        it('Apply action on current frame', () => {
            cy.openAnnotationsActionsModal();
            cy.selectAnnotationsAction(ACTION_NAME);
            cy.setAnnotationActionParameter('Target frame', 'input', 0);
            cy.runAnnotationsAction();
            cy.waitAnnotationsAction();
            cy.closeAnnotationsActionsModal();
            checkFramesContainShapes(0, 0, 2);
        });

        it('Apply action on mask with different frame sizes. Mask is cropped. Segmentation mask export is available', () => {
            // Default frame size is 800x800, but last frame is 500x500
            cy.goCheckFrameNumber(latestFrameNumber - 1);
            cy.startMaskDrawing();
            cy.drawMask([{
                method: 'brush',
                coordinates: [[620, 620], [700, 620], [700, 700], [620, 700]],
            }]);
            cy.finishMaskDrawing();

            cy.openAnnotationsActionsModal();
            cy.selectAnnotationsAction(ACTION_NAME);
            cy.runAnnotationsAction();
            cy.waitAnnotationsAction();
            cy.closeAnnotationsActionsModal();

            cy.get('.cvat_canvas_shape').should('have.length', 1);
            cy.goCheckFrameNumber(latestFrameNumber);
            cy.get('.cvat_canvas_shape').should('have.length', 1);

            cy.saveJob('PATCH', 200, 'saveJob');
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: FORMAT_NAME,
            };
            cy.exportJob(exportAnnotation);
            cy.downloadExport().then((file) => {
                cy.verifyDownload(file);
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
