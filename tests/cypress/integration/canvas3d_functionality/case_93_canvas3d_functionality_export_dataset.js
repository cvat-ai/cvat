// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Export as a dataset.', () => {
    const caseId = '93';
    const cuboidCreationParams = {
        labelName: labelName,
    };

    const dumpTypePC = 'Sly Point Cloud Format';
    const dumpTypeVC = 'Kitti Raw Format';

    function exportDataset (format, as) {
        cy.intercept('GET', '/api/v1/tasks/**/dataset**').as(as);
        cy.interactMenu('Export task dataset');
        cy.get('.cvat-modal-export-task').find('.cvat-modal-export-select').click();
        cy.get('.ant-select-dropdown')
            .not('.ant-select-dropdown-hidden')
            .contains('.cvat-modal-export-option-item', format)
            .click();
        cy.get('.cvat-modal-export-select').should('contain.text', format);
        cy.get('.cvat-modal-export-task').find('[type="checkbox"]').should('not.be.checked').check();
        cy.get('.cvat-modal-export-task').contains('button', 'OK').click();
        cy.wait(`@${as}`, { timeout: 5000 }).its('response.statusCode').should('equal', 202);
        cy.wait(`@${as}`).its('response.statusCode').should('equal', 201);
    }

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.saveJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export as a dataset with "Point Cloud" format.', () => {
            exportDataset(dumpTypePC, 'exportDatasetPC');
        });

        it('Export as a dataset with "Velodyne Points" format.', () => {
            exportDataset(dumpTypeVC, 'exportDatasetVC');
            cy.removeAnnotations();
            cy.saveJob('PUT');
        });
    });
});
