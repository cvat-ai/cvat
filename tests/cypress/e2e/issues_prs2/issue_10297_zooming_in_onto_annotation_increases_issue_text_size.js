// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Zooming onto an annotation must not scale issue text size', () => {
    const issueId = '10297';
    const labelName = `Issue ${issueId}`;
    const issueDescription = `Issue for bug ${issueId}`;
    const issueLabelSelector = '.cvat-hidden-issue-label';
    const shapeSelector = '#cvat_canvas_shape_1';
    const issueRegionSelector = '.cvat_canvas_issue_region';

    let taskID = null;
    let jobID = null;

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

    after(() => {
        if (taskID) {
            cy.headlessDeleteTask(taskID);
        }
        cy.logout();
    });

    describe(`Testing issue "${issueId}"`, { scrollBehavior: false }, () => {
        it('Double-click zoom keeps issue text size visually stable', () => {
            cy.createIssueFromObject(1, 'Open an issue ...', issueDescription);

            let labelRectBefore = null;
            let regionRectBefore = null;

            cy.contains(issueLabelSelector, issueDescription)
                .should('be.visible')
                .then(($label) => {
                    labelRectBefore = $label[0].getBoundingClientRect();
                });

            cy.get(issueRegionSelector)
                .should('be.visible')
                .then(($region) => {
                    regionRectBefore = $region[0].getBoundingClientRect();
                });

            cy.get(shapeSelector).dblclick();

            cy.get(issueRegionSelector)
                .should('be.visible')
                .then(($region) => {
                    const regionRectAfter = $region[0].getBoundingClientRect();
                    expect(regionRectAfter.width).to.be.greaterThan(regionRectBefore.width);
                    expect(regionRectAfter.height).to.be.greaterThan(regionRectBefore.height);
                });

            cy.contains(issueLabelSelector, issueDescription)
                .should('be.visible')
                .then(($label) => {
                    const labelRectAfter = $label[0].getBoundingClientRect();

                    expect(Math.abs(labelRectAfter.width - labelRectBefore.width)).to.be.lessThan(2);
                    expect(Math.abs(labelRectAfter.height - labelRectBefore.height)).to.be.lessThan(2);
                });
        });
    });
});
