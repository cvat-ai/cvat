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

    before(() => {
        cy.openTask(taskName)
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.saveJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export as a dataset with "Point Cloud" format.', () => {
            cy.intercept('GET', '/api/v1/tasks/**/dataset**').as('exportDatasetPC');
            cy.interactMenu('Export as a dataset');
            cy.get('.cvat-menu-export-submenu-item').within(() => {
                cy.contains(dumpTypePC).click();
            });
            cy.wait('@exportDatasetPC', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@exportDatasetPC').its('response.statusCode').should('equal', 201);
        });

        it('Export as a dataset with "Velodyne Points" format.', () => {
            cy.intercept('GET', '/api/v1/tasks/**/dataset**').as('exportDatasetVC');
            cy.interactMenu('Export as a dataset');
            cy.get('.cvat-menu-export-submenu-item').within(() => {
                cy.contains(dumpTypeVC).click();
            });
            cy.wait('@exportDatasetVC', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@exportDatasetVC').its('response.statusCode').should('equal', 201);
            cy.removeAnnotations();
            cy.saveJob('PUT');
        });
    });
});
