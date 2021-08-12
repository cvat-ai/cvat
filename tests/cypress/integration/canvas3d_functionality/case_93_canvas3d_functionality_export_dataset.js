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
        cy.openTask(taskName);
        cy.openJob();
        cy.wait(1000); // Waiting for the point cloud to display
        cy.create3DCuboid(cuboidCreationParams);
        cy.saveJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Export as a dataset with "Point Cloud" format.', () => {
            const exportDatasetPCFormat = {
                as: 'exportDatasetPCFormat',
                type: 'dataset',
                format: dumpTypePC,
            };
            cy.exportTask(exportDatasetPCFormat);
            cy.wait(2000) // Waiting for a full file download
            const regex = new RegExp(`^task_${taskName.toLowerCase()}-.*-${exportDatasetPCFormat.format.toLowerCase()}.*.zip$`);
            cy.task('listFiles', 'cypress/fixtures').each((fileName) => {
                if (fileName.match(regex)) {
                    cy.fixture(fileName).should('exist');
                }
            });
        });

        it('Export as a dataset with "Velodyne Points" format.', () => {
            const exportDatasetVCFormat = {
                as: 'exportDatasetVCFormat',
                type: 'dataset',
                format: dumpTypeVC,
            };
            cy.exportTask(exportDatasetVCFormat);
            cy.wait(2000) // Waiting for a full file download
            const regex = new RegExp(`^task_${taskName.toLowerCase()}-.*-${exportDatasetVCFormat.format.toLowerCase()}.*.zip$`);
            cy.task('listFiles', 'cypress/fixtures').each((fileName) => {
                if (fileName.match(regex)) {
                    cy.fixture(fileName).should('exist');
                }
            });
            cy.removeAnnotations();
            cy.saveJob('PUT');
        });
    });
});
