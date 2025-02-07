// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable cypress/no-unnecessary-waiting */

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const_canvas3d';

context('3D cuboids interpolation pipeline', () => {
    const cuboidCreationParams = {
        objectType: 'Track',
        labelName,
        x: 460,
        y: 390,
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.wait(2000); // waiting for the point cloud to display
    });

    describe('Drawing a cuboid', () => {
        it('Check track-related elements', () => {
            cy.get('.cvat-merge-control').should('exist').and('be.visible');
            cy.get('.cvat-split-track-control').should('exist').and('be.visible');
            cy.get('.cvat-annotation-header-button').contains('Info').click();
            cy.get('.cvat-job-info-modal-window').should('exist').and('be.visible').within(() => {
                cy.get('table tr:nth-child(3) td:nth-child(2)').should('contain.text', '0 / 0');
            });
            cy.get('.ant-modal-content button').contains('OK').click();
        });

        it('Just add a cuboid track and update it on the second frame, check interpolation', () => {
            let initialX = 0;
            let initialY = 0;
            let initialZ = 0;
            cy.get('.cvat-canvas3d-perspective canvas').then(([el]) => {
                const bbox = el.getBoundingClientRect();
                cuboidCreationParams.x -= bbox.x;
                cuboidCreationParams.y -= bbox.y;
                return el;
            }).then(([el]) => {
                cy.create3DCuboid(cuboidCreationParams);
                cy.get('#cvat-objects-sidebar-state-item-1').should('exist').and('contain.text', 'CUBOID TRACK').then(() => {
                    const cuboid = Object.values(el.getDrawnObjects())[0].cuboid.perspective;
                    ({ x: initialX, y: initialY, z: initialZ } = cuboid.position);
                });
            });

            cy.goCheckFrameNumber(2);
            cy.wait(1000); // waiting for the point cloud to display
            cy.get('.cvat-canvas3d-topview canvas').then(([el]) => {
                const { state } = Object.values(el.getDrawnObjects())[0];
                const [x, y, z] = [0, 0, 0];
                const [rotX, rotY, rotZ] = [Math.PI, Math.PI, Math.PI];
                const [width, height, depth] = [2, 2, 2];
                el.updatePosition(
                    state, Array.from([x, y, z, rotX, rotY, rotZ, width, height, depth, 0, 0, 0, 0, 0, 0, 0]),
                );
            });

            cy.goCheckFrameNumber(1);
            cy.wait(1000); // waiting for the point cloud to display
            cy.get('.cvat-canvas3d-topview canvas').then(([el]) => {
                const cuboid = Object.values(el.getDrawnObjects())[0].cuboid.perspective;
                expect(cuboid.position.x).to.equal(initialX / 2);
                expect(cuboid.position.y).to.equal(initialY / 2);
                expect(cuboid.position.z).to.equal(initialZ / 2);
                expect(cuboid.scale.x).to.equal(1.5);
                expect(cuboid.scale.y).to.equal(1.5);
                expect(cuboid.scale.z).to.equal(1.5);
                expect(cuboid.rotation.x).to.equal(Math.PI / 2);
                expect(cuboid.rotation.y).to.equal(Math.PI / 2);
                expect(cuboid.rotation.z).to.equal(Math.PI / 2);
            });

            cy.removeAnnotations();
        });
    });
});
