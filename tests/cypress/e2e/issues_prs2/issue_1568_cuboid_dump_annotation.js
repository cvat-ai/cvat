// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Dump annotation if cuboid created.', () => {
    const issueId = '1568';
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const exportFormat = 'Datumaro';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing issue "${issueId}"`, () => {
        it('Create a cuboid.', () => {
            cy.createCuboid(createCuboidShape2Points);
            cy.saveJob('PATCH', 200, `dump${exportFormat}Format`);
        });

        it('Dump an annotation.', () => {
            const exportAnnotation = {
                as: 'exportAnnotations',
                type: 'annotations',
                format: exportFormat,
            };
            cy.exportJob(exportAnnotation);
            cy.waitForDownload();
        });

        it('Error notification is not exists.', () => {
            cy.get('.ant-notification-notice-error').should('not.exist');
        });
    });
});
