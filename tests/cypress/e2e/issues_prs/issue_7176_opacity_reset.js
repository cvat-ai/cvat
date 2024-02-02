// Copyright (C) 2023 CVAT.ai Corporation
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
    const drawingActions = [{
        method: 'brush',
        coordinates: [[300, 300], [700, 300], [700, 700], [300, 700]],
    }];

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
        }).then(() => {
            cy.visit(`/tasks/${taskID}/jobs/${jobID}`);
            cy.get('.cvat-canvas-container').should('exist').and('be.visible');
        });

        cy.goCheckFrameNumber(2);
        cy.startMaskDrawing();
        cy.drawMask(drawingActions);
        cy.get('.cvat-brush-tools-finish').click();
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
        it('Set low opacity value, draw a rectangle.', () => {
            cy.goCheckFrameNumber(0);
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

        it('Go to the next frame with mask. Opacity resets.', () => {
            cy.goCheckFrameNumber(2);
            checkOpacitySliders(30, 60);
        });

        it('Decrease opacity. Opacity does not reset on frames without masks. Opacity resets on frames with masks', () => {
            setSliderValue('.cvat-appearance-opacity-slider', 20);
            setSliderValue('.cvat-appearance-selected-opacity-slider', 50);
            cy.goCheckFrameNumber(0);
            checkOpacitySliders(20, 50);
            cy.goCheckFrameNumber(1);
            checkOpacitySliders(20, 50);
            cy.goCheckFrameNumber(2);
            checkOpacitySliders(30, 60);
        });

        it('Increase opacity. Opacity does not reset on high values', () => {
            setSliderValue('.cvat-appearance-opacity-slider', 40);
            setSliderValue('.cvat-appearance-selected-opacity-slider', 70);
            for (let i = 0; i < 3; i++) {
                cy.goCheckFrameNumber(0);
                checkOpacitySliders(40, 70);
            }
        });
    });
});
