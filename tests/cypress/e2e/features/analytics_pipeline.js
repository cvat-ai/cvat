// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Analytics pipeline', () => {
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const mainLabelName = 'label';
    const secondLabelName = 'secondLabel';
    const projectName = 'A project for testing performance analytics';
    const projectLabels = [
        { name: mainLabelName, attributes: [], type: 'any' },
        { name: secondLabelName, attributes: [], type: 'any' },
    ];

    const taskName = 'Annotation task for testing performance analytics';

    let projectID = null;
    let jobID = null;
    let taskID = null;

    const rectangles = [
        {
            points: 'By 2 Points',
            type: 'Shape',
            labelName: mainLabelName,
            firstX: 270,
            firstY: 350,
            secondX: 370,
            secondY: 450,
        },
        {
            points: 'By 2 Points',
            type: 'Shape',
            labelName: mainLabelName,
            firstX: 350,
            firstY: 450,
            secondX: 450,
            secondY: 550,
        },
        {
            points: 'By 2 Points',
            type: 'Shape',
            labelName: mainLabelName,
            firstX: 130,
            firstY: 200,
            secondX: 150,
            secondY: 250,
        },
    ];

    const cardEntryNames = ['annotation_time', 'total_object_count', 'total_annotation_speed'];
    function checkCards(notNull) {
        cy.get('.cvat-analytics-card')
            .should('have.length', 3)
            .each((card) => {
                cy.wrap(card)
                    .invoke('data', 'entry-name')
                    .then((val) => {
                        expect(cardEntryNames.includes(val)).to.eq(true);
                        if (notNull && ['total_object_count', 'total_annotation_speed'].includes(val)) {
                            cy.wrap(card).within(() => {
                                cy.get('.cvat-analytics-card-value').should('not.have.text', '0.0');
                            });
                        }
                    });
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

    function waitForReport(authKey, rqID) {
        cy.request({
            method: 'POST',
            url: `api/analytics/reports?rq_id=${rqID}`,
            headers: {
                Authorization: `Token ${authKey}`,
            },
            body: {
                project_id: projectID,
            },
        }).then((response) => {
            if (response.status === 201) {
                return;
            }
            waitForReport(authKey, rqID);
        });
    }

    function openAnalytics(type) {
        if (['task', 'project'].includes(type)) {
            const actionsMenu = type === 'project' ? '.cvat-project-actions-menu' : '.cvat-actions-menu';
            const actionsButton = type === 'project' ? '.cvat-project-page-actions-button' : '.cvat-task-page-actions-button';
            cy.get(actionsButton).click();
            cy.get(actionsMenu)
                .should('be.visible')
                .find('[role="menuitem"]')
                .filter(':contains("View analytics")')
                .last()
                .click();
        }
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
                [jobID] = taskResponse.jobIDs;

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
                .click();
            cy.get('.ant-dropdown')
                .not('.ant-dropdown-hidden')
                .within(() => {
                    cy.contains('[role="menuitem"]', 'View analytics').click();
                });
            checkCards();
            checkHistograms();

            cy.visit(`/projects/${projectID}`);
            openAnalytics('project');
            checkCards();
            checkHistograms();

            cy.visit(`/tasks/${taskID}`);
            openAnalytics('task');
            checkCards();
            checkHistograms();
        });

        it('Make some actions with objects, create analytics report, check performance pages', () => {
            cy.visit(`/tasks/${taskID}`);
            cy.get('.cvat-job-item').contains('a', `Job #${jobID}`).click();
            cy.get('.cvat-spinner').should('not.exist');

            rectangles.forEach((rectangle, index) => {
                cy.goCheckFrameNumber(index);
                cy.createRectangle(rectangle);
            });
            cy.saveJob();

            cy.goCheckFrameNumber(0);
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .type(`${secondLabelName}{Enter}`);
            cy.get('#cvat-objects-sidebar-state-item-1')
                .find('.cvat-objects-sidebar-state-item-label-selector')
                .trigger('mouseout');
            cy.saveJob();

            cy.goToNextFrame(1);
            cy.get('#cvat_canvas_shape_2').trigger('mousemove');
            cy.get('#cvat_canvas_shape_2').should('have.class', 'cvat_canvas_shape_activated');
            cy.get('body').type('{del}');
            cy.get('#cvat_canvas_shape_2').should('not.exist');
            cy.saveJob();

            cy.logout();
            cy.getAuthKey().then((res) => {
                const authKey = res.body.key;
                cy.request({
                    method: 'POST',
                    url: 'api/analytics/reports',
                    headers: {
                        Authorization: `Token ${authKey}`,
                    },
                    body: {
                        project_id: projectID,
                    },
                }).then((response) => {
                    const rqID = response.body.rq_id;
                    waitForReport(authKey, rqID);
                });
            });
            cy.login();
            cy.intercept('GET', '/api/analytics/reports**').as('getReport');

            cy.visit(`/projects/${projectID}`);
            openAnalytics('project');
            cy.wait('@getReport');
            checkCards(true);
            checkHistograms();

            cy.visit(`/tasks/${taskID}`);
            openAnalytics('task');
            cy.wait('@getReport');
            checkCards(true);
            checkHistograms();

            cy.visit(`/tasks/${taskID}`);
            cy.get('.cvat-job-item').contains('a', `Job #${jobID}`)
                .parents('.cvat-job-item')
                .find('.cvat-job-item-more-button')
                .click();

            cy.wait(500); // wait for animationend
            cy.get('.cvat-job-item-menu')
                .should('exist')
                .and('be.visible')
                .find('[role="menuitem"]')
                .filter(':contains("View analytics")')
                .click();
            cy.wait('@getReport');
            checkCards(true);
            checkHistograms();
        });
    });
});
