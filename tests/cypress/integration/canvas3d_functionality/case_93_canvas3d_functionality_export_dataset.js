// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('Canvas 3D functionality. Export as a dataset.', () => {
    const caseId = '93';
    const cuboidCreationParams = {
        labelName,
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
            cy.waitForDownload();
        });

        it('Export as a dataset with "Velodyne Points" format.', () => {
            const exportDatasetVCFormat = {
                as: 'exportDatasetVCFormat',
                type: 'dataset',
                format: dumpTypeVC,
            };
            cy.exportTask(exportDatasetVCFormat);
            cy.waitForDownload();
        });

        it('Export as a dataset with renaming the archive.', () => {
            const exportDatasetVCFormatRenameArchive = {
                as: 'exportDatasetVCFormatRenameArchive',
                type: 'dataset',
                format: dumpTypeVC,
                archiveCustomeName: 'task_export_3d_dataset_custome_name_vc_format',
            };
            cy.exportTask(exportDatasetVCFormatRenameArchive);
            cy.waitForDownload();
            cy.removeAnnotations();
            cy.saveJob('PUT');
        });
    });
});
