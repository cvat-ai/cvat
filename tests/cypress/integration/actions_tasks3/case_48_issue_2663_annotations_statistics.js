// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Annotations statistics.', () => {
    const caseId = '48';
    const issueId = '2663';
    const createRectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createRectangleTrack2Points = {
        points: 'By 2 Points',
        type: 'Track',
        labelName,
        firstX: createRectangleShape2Points.firstX,
        firstY: createRectangleShape2Points.firstY - 150,
        secondX: createRectangleShape2Points.secondX,
        secondY: createRectangleShape2Points.secondY - 150,
    };
    const createEllipseShape = {
        type: 'Shape',
        labelName,
        cx: 400,
        cy: 400,
        rightX: 500,
        topY: 350,
    };
    const createEllipseTrack = {
        type: 'Track',
        labelName,
        cx: createEllipseShape.cx,
        cy: createEllipseShape.cy - 150,
        rightX: createEllipseShape.rightX,
        topY: createEllipseShape.topY - 150,
    };
    const createCuboidShape2Points = {
        points: 'From rectangle',
        type: 'Shape',
        labelName,
        firstX: 250,
        firstY: 350,
        secondX: 350,
        secondY: 450,
    };
    const createCuboidTrack2Points = {
        points: 'From rectangle',
        type: 'Track',
        labelName,
        firstX: createCuboidShape2Points.firstX,
        firstY: createCuboidShape2Points.firstY + 150,
        secondX: createCuboidShape2Points.secondX,
        secondY: createCuboidShape2Points.secondY + 150,
    };
    const createPolygonShape = {
        reDraw: false,
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 100, y: 100 },
            { x: 150, y: 100 },
            { x: 150, y: 150 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolygonTrack = {
        reDraw: false,
        type: 'Track',
        labelName,
        pointsMap: [
            { x: 200, y: 100 },
            { x: 250, y: 100 },
            { x: 250, y: 150 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesShape = {
        type: 'Shape',
        labelName,
        pointsMap: [
            { x: 300, y: 100 },
            { x: 350, y: 100 },
            { x: 350, y: 150 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPolylinesTrack = {
        type: 'Track',
        labelName,
        pointsMap: [
            { x: 400, y: 100 },
            { x: 450, y: 100 },
            { x: 450, y: 150 },
        ],
        complete: true,
        numberOfPoints: null,
    };
    const createPointsShape = {
        type: 'Shape',
        labelName,
        pointsMap: [{ x: 200, y: 400 }],
        complete: true,
        numberOfPoints: null,
    };
    const createPointsTrack = {
        type: 'Track',
        labelName,
        pointsMap: [{ x: 300, y: 400 }],
        complete: true,
        numberOfPoints: null,
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(createRectangleShape2Points);
        cy.createRectangle(createRectangleTrack2Points);
        cy.createTag(labelName);
        cy.goToNextFrame(1);
        cy.createCuboid(createCuboidShape2Points);
        cy.createCuboid(createCuboidTrack2Points);
        cy.goToNextFrame(2);
        cy.createPolygon(createPolygonShape);
        cy.createPolygon(createPolygonTrack);
        cy.goToNextFrame(3);
        cy.createPolyline(createPolylinesShape);
        cy.createPolyline(createPolylinesTrack);
        cy.goToNextFrame(4);
        cy.createPoint(createPointsShape);
        cy.createPoint(createPointsTrack);
        cy.goToNextFrame(5);
        cy.createEllipse(createEllipseShape);
        cy.createEllipse(createEllipseTrack);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Open annotation statistics.', () => {
            cy.contains('.cvat-annotation-header-button', 'Info').click();
            cy.get('.cvat-job-info-modal-window').should('be.visible');
        });

        it(`Check issue ${issueId}`, () => {
            // Issue 2663: "Cuboids are missed in annotations statistics"
            const objectTypes = ['Rectangle', 'Polygon', 'Polyline', 'Points', 'Cuboids', 'Tags'];
            cy.get('.cvat-job-info-statistics')
                .find('table')
                .first()
                .find('tr')
                .then((jobInfoTableHeader) => {
                    cy.get(jobInfoTableHeader)
                        .find('th')
                        .then((jobInfoTableHeaderColumns) => {
                            const elTextContent = Array.from(jobInfoTableHeaderColumns).map((el) => (
                                el.textContent.replace(/\s/g, '')
                            )); // Removing spaces. For example: " Tags ". In Firefox, this causes an error.
                            for (let i = 0; i < objectTypes.length; i++) {
                                expect(elTextContent)
                                    .to.include(objectTypes[i]); // expected [ Array(11) ] to include Cuboids, etc.
                            }
                        });
                });
        });

        it('Annotation statistics shows valid results.', () => {
            cy.get('.cvat-job-info-statistics')
                .find('table')
                .last()
                .within(() => {
                    cy.contains(labelName)
                        .parents('tr')
                        .find('td')
                        .then((tableBodyFirstRowThs) => {
                            const elTextContent = Array.from(tableBodyFirstRowThs).map((el) => el.textContent);
                            expect(elTextContent[0]).to.be.equal(labelName);
                            for (let i = 1; i < 7; i++) {
                                expect(elTextContent[i]).to.be.equal('1 / 1'); // Rectangle, Polygon, Polyline, Points, Cuboids, Ellipses
                            }
                            expect(elTextContent[7]).to.be.equal('1'); // Tags
                            expect(elTextContent[8]).to.be.equal('13'); // Manually
                            expect(elTextContent[9]).to.be.equal('39'); // Interpolated
                            expect(elTextContent[10]).to.be.equal('52'); // Total
                        });
                });
            cy.contains('[type="button"]', 'OK').click();
            cy.get('.cvat-job-info-modal-window').should('not.be.visible');
        });
    });
});
