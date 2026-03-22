// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Zooming onto an annotation must not scale issue text size', () => {
    const issueId = '10297';
    const labelName = `Issue ${issueId}`;

    let taskID = null;
    let jobID = null;
    let origDispatchEvent = null;

    before(() => {
        cy.visit('/auth/login');
        cy.login();

        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'any' }],
            name: `Task issue ${issueId}`,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: ['images/image_1.jpg'],
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;

            cy.headlessCreateObjects([{
                objectType: 'shape',
                labelName,
                frame: 0,
                type: 'rectangle',
                points: [200, 200, 400, 400],
            }], jobID);

            cy.headlessUpdateJob(jobID, { stage: 'validation', state: 'in progress' });

            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
            cy.get('.cvat-spinner').should('not.exist');
        });
    });

    afterEach(() => {
        cy.window().then((win) => {
            if (origDispatchEvent) {
                win.EventTarget.prototype.dispatchEvent = origDispatchEvent;
                origDispatchEvent = null;
            }
        });
    });

    after(() => {
        if (taskID) {
            cy.headlessDeleteTask(taskID);
        }
        cy.logout();
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Double-click zoom dispatches canvas.zoom event so issue text is not scaled', () => {
            cy.createIssueFromObject(1, 'Open an issue ...', `Issue for bug ${issueId}`);

            cy.window().then((win) => {
                const zoomEventFired = { value: false };
                origDispatchEvent = win.EventTarget.prototype.dispatchEvent;
                win.EventTarget.prototype.dispatchEvent = function dispatchEvent(event) {
                    if (event.type === 'canvas.zoom') {
                        zoomEventFired.value = true;
                    }
                    return origDispatchEvent.call(this, event);
                };

                cy.get('#cvat_canvas_shape_1').dblclick();
                cy.wrap(zoomEventFired).its('value').should('be.true');
            });
        });
    });
});
