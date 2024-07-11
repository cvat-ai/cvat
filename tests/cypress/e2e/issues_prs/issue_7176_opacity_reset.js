// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

const issueId = '7176';

context('Opacity and Selected opacity reset on each frame change', { scrollBehavior: false }, () => {
    const taskName = `Test issue #${issueId}`;
    const serverFiles = ['images/image_1.jpg', 'images/image_2.jpg', 'images/image_3.jpg'];
    const labelName = `issue#${issueId}`;
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 100,
        firstY: 350,
        secondX: 200,
        secondY: 450,
    };

    let taskID = null;
    let jobID = null;

    function checkOpacitySliders(opacity, selectedOpacity) {
        cy.get('.cvat-appearance-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', opacity);
        cy.get('.cvat-appearance-selected-opacity-slider').find('[role="slider"]').should('have.attr', 'aria-valuenow', selectedOpacity);
    }

    function setSliderValue(slider, value) {
        let arrowsString = '';
        cy.get(slider)
            .within(() => {
                cy.get('[role="slider"]')
                    .should('have.attr', 'aria-valuenow')
                    .then(($ariaValueNow) => {
                        const steps = value - $ariaValueNow;
                        arrowsString = (steps > 0 ? '{rightarrow}' : '{leftarrow}').repeat(Math.abs(steps));
                    })
                    .then(() => {
                        cy.get('.ant-slider-handle').type(arrowsString);
                    });
            });
    }

    before(() => {
        cy.visit('auth/login');
        cy.login();
        cy.headlessCreateTask({
            labels: [{ name: labelName, attributes: [], type: 'any' }],
            name: taskName,
            project_id: null,
            source_storage: { location: 'local' },
            target_storage: { location: 'local' },
        }, {
            server_files: serverFiles,
            image_quality: 70,
            use_zip_chunks: true,
            use_cache: true,
            sorting_method: 'lexicographical',
        }).then((response) => {
            taskID = response.taskID;
            [jobID] = response.jobIDs;

            cy.headlessCreateObjects([{
                frame: 2,
                objectType: 'SHAPE',
                shapeType: 'MASK',
                points: [0, 10000, 100, 100, 199, 199],
                occluded: false,
            }], jobID);
        }).then(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });
    });

    after(() => {
        cy.logout();
        cy.getAuthKey().then((response) => {
            const authKey = response.body.key;
            cy.request({
                method: 'DELETE',
                url: `/api/tasks/${taskID}`,
                headers: {
                    Authorization: `Token ${authKey}`,
                },
            });
        });
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Annotation view opened with increased opacity level as there are masks in the job', () => {
            checkOpacitySliders(30, 60);
        });

        it('Set lower opacity value, draw a rectangle.', () => {
            setSliderValue('.cvat-appearance-opacity-slider', 20);
            setSliderValue('.cvat-appearance-selected-opacity-slider', 40);
            cy.createRectangle(createRectangleShape2Points);
            checkOpacitySliders(20, 40);
        });

        it('Go to the next frame, draw a rectangle. Opacity does not reset', () => {
            cy.goCheckFrameNumber(1);
            cy.createRectangle(createRectangleShape2Points);
            checkOpacitySliders(20, 40);
        });

        it('Go to the next frame with mask. Opacity level keeps lower', () => {
            cy.goCheckFrameNumber(2);
            checkOpacitySliders(20, 40);
        });
    });
});
