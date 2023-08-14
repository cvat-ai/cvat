// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Analytics pipeline', () => {
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const projectName = 'A project for testing performance analytics';
    const projectLabels = [{ name: 'label', attributes: [], type: 'any' }];

    const taskName = 'Annotation task for testing performance analytics';

    let projectID = null;
    let jobID = null;
    let taskID = null;

    const cardEntryNames = ['annotation_time', 'total_object_count', 'total_annotation_speed'];
    function checkCards() {
        cy.get('.cvat-analytics-card')
            .should('have.length', 3)
            .each((card) => {
                cy.wrap(card).invoke('data', 'entry-name')
                    .then((val) => expect(cardEntryNames.includes(val)).to.be.true);
            });
    }

    const histogramEntryNames = ['objects', 'annotation_speed'];
    function checkHistograms() {
        cy.get('.cvat-performance-histogram-card')
            .should('have.length', 2)
            .each((card) => {
                cy.wrap(card).invoke('data', 'entry-name')
                    .then((val) => expect(histogramEntryNames.includes(val)).to.be.true);
            });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();

        cy.headlessCreateProject({
            labels: projectLabels,
            name: projectName,
        }).then((response) => {
            projectID = response.projectID;

            cy.headlessCreateTask({
                labels: [],
                name: taskName,
                project_id: projectID,
                source_storage: { location: 'local' },
                target_storage: { location: 'local' },
            }, {
                server_files: serverFiles,
                image_quality: 70,
                use_zip_chunks: true,
                use_cache: true,
                sorting_method: 'lexicographical',
            }).then((taskResponse) => {
                taskID = taskResponse.taskID;
                [jobID] = taskResponse.jobID;

                cy.visit(`/tasks/${taskID}`);
                cy.get('.cvat-task-details').should('exist').and('be.visible');
            });
        });
    });

    describe('Analytics pipeline', () => {
        it('Check empty performance pages', () => {
            cy.get('.cvat-job-item').contains('a', `Job #${jobID}`)
                .parents('.cvat-job-item')
                .find('.cvat-job-item-more-button')
                .trigger('mouseover');
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', 'View analytics').click();
                });
            checkCards();
            checkHistograms();

            cy.visit(`/tasks/${taskID}`);
            cy.get('.cvat-task-page-actions-button').click();
            cy.get('.cvat-actions-menu')
                .should('be.visible')
                .find('[role="menuitem"]')
                .filter(':contains("View analytics")')
                .last()
                .click();
            checkCards();
            checkHistograms();

            cy.visit(`/projects/${projectID}`);
            cy.get('.cvat-project-page-actions-button').click();
            cy.get('.cvat-project-actions-menu')
                .should('be.visible')
                .find('[role="menuitem"]')
                .filter(':contains("View analytics")')
                .last()
                .click();
            checkCards();
            checkHistograms();
        });
    });
});
