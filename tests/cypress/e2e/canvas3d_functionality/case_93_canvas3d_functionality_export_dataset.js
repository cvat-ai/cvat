// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Export as a dataset.', () => {
    const caseId = '93';
    const cuboidCreationParams = {
        objectType: 'Shape',
        labelName,
        x: 480,
        y: 160,
    };

    const dumpTypePC = 'Sly Point Cloud Format';
    const dumpTypeVC = 'Kitti Raw Format';

    before(() => {
        cy.openTask(taskName);
        cy.openJob();
        // eslint-disable-next-line cypress/no-unnecessary-waiting
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
            cy.exportJob(exportDatasetPCFormat);
            cy.waitForDownload();
        });

        it('Export as a dataset with "Velodyne Points" format.', () => {
            const exportDatasetVCFormat = {
                as: 'exportDatasetVCFormat',
                type: 'dataset',
                format: dumpTypeVC,
            };
            cy.exportJob(exportDatasetVCFormat);
            cy.waitForDownload();
        });

        it('Export as a dataset with renaming the archive.', () => {
            const exportDatasetVCFormatRenameArchive = {
                as: 'exportDatasetVCFormatRenameArchive',
                type: 'dataset',
                format: dumpTypeVC,
                archiveCustomName: 'job_export_3d_dataset_custome_name_vc_format',
            };
            cy.exportJob(exportDatasetVCFormatRenameArchive);
            cy.waitForDownload();
            cy.removeAnnotations();
            cy.saveJob('PUT');
        });
    });
});
