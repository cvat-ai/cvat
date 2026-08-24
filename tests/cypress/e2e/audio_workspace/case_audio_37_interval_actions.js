// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Interval actions.', () => {
    const caseId = 'audio_37';
    const CURSOR_TOLERANCE_PX = 4;
    const FIT_INSET_TOLERANCE_PX = 8;

    const createInterval = (start, end) => {
        cy.audioCreateRegionViaButton(firstLabelName, start, end);
        cy.get('.cvat-audio-region-item').last().should('have.class', 'cvat-audio-region-item-active');
    };

    const actionIcons = {
        // note: lock and unlock icons show current state rather than action
        // that's gonna be performed hence they are intentionally inverted
        lock: 'unlock',
        unlock: 'lock',
        pin: 'pushpin',
        unpin: 'pushpin',
        hide: 'eye',
        show: 'eye-invisible',
    };

    const actionParents = [
        { name: 'the sidebar interval row', selector: '.cvat-audio-region-item' },
        { name: 'the active interval details header', selector: '.cvat-audio-region-details' },
    ];

    const expectRegionEditingControls = (exists) => {
        cy.getAudioRegion().should(exists ? 'have.css' : 'not.have.css', 'cursor', 'grab');
        cy.getAudioRegionHandle('left').should(exists ? 'exist' : 'not.exist');
        cy.getAudioRegionHandle('right').should(exists ? 'exist' : 'not.exist');
    };

    const expectCursorAtIntervalBoundary = (boundary) => {
        cy.getAudioWaveformCursor().then(($cursor) => {
            cy.getAudioRegion().should('have.length', 1).then(($region) => {
                const cursor = $cursor[0].getBoundingClientRect();
                const region = $region[0].getBoundingClientRect();
                const expected = boundary === 'start' ? region.left : region.right;

                expect(cursor.left).to.be.closeTo(expected, CURSOR_TOLERANCE_PX);
            });
        });
    };

    const expectIntervalFitsViewport = () => {
        cy.getAudioWaveformScrollContainer().should(($scroll) => {
            const viewport = $scroll[0].getBoundingClientRect();
            const safeInset = Math.max($scroll[0].clientWidth * 0.1, 64);
            const region = $scroll[0].getRootNode().querySelector('[part~="region"]');

            expect(region).to.not.be.null;
            const bounds = region.getBoundingClientRect();
            expect(bounds.left).to.be.closeTo(viewport.left + safeInset, FIT_INSET_TOLERANCE_PX);
            expect(bounds.right).to.be.closeTo(viewport.right - safeInset, FIT_INSET_TOLERANCE_PX);
        });
    };

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
        cy.audioSliderSetValue('cvat-audio-zoom-control', '{home}', 1);
    });

    afterEach(() => {
        cy.hideTooltips();
        cy.audioClearAnnotations();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Sets playback to the selected interval boundaries with [ and ]', () => {
            createInterval(200, 450);

            cy.get('body').type('[');
            expectCursorAtIntervalBoundary('start');

            cy.get('body').type(']');
            expectCursorAtIntervalBoundary('end');
        });

        it('Plays the selected interval once with \\', () => {
            createInterval(100, 112);

            cy.get('body').type('\\');
            cy.get('.cvat-player-pause-button').should('exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
        });

        it('Fits the selected interval into the waveform viewport with I', () => {
            createInterval(300, 450);
            cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', 40);
            cy.getAudioWaveformScrollContainer().then(($scroll) => {
                cy.wrap($scroll).scrollTo($scroll[0].scrollWidth, 0);
            });

            cy.get('body').type('i');
            expectIntervalFitsViewport();
        });

        actionParents.forEach(({ name, selector }) => {
            describe(`Interval actions from ${name}`, () => {
                const getAction = (iconSelector) => (
                    cy.get(selector).find(`.cvat-audio-region-item-action-btn:has(${iconSelector})`)
                );
                const getPlaybackAction = (boundary) => {
                    const playbackActions = getAction('.cvat-audio-interval-playback-icon');
                    return boundary === 'start' ? playbackActions.first() : playbackActions.last();
                };
                const getIntervalAction = (action) => getAction(`.anticon-${actionIcons[action]}`);
                const clickIntervalAction = (action) => getIntervalAction(action).click();

                it('Sets playback to the selected interval boundaries from its actions', () => {
                    createInterval(200, 450);

                    getPlaybackAction('start').click();
                    expectCursorAtIntervalBoundary('start');

                    getPlaybackAction('end').click();
                    expectCursorAtIntervalBoundary('end');
                });

                it('Plays the selected interval once from its action', () => {
                    createInterval(100, 112);

                    getAction('.cvat-audio-interval-play-icon').click();
                    cy.get('.cvat-player-pause-button').should('exist');
                    cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
                });

                it('Fits the selected interval into the waveform viewport from the menu', () => {
                    createInterval(300, 450);
                    cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', 40);
                    cy.getAudioWaveformScrollContainer().then(($scroll) => {
                        cy.wrap($scroll).scrollTo($scroll[0].scrollWidth, 0);
                    });

                    getAction('.anticon-more').click();
                    cy.get('.cvat-audio-region-item-menu').contains('button', 'Fit interval').click();
                    expectIntervalFitsViewport();
                });

                it('Locks an interval from its action and unlocks it with L', () => {
                    createInterval(100, 250);
                    expectRegionEditingControls(true);

                    clickIntervalAction('lock');
                    getIntervalAction('unlock').should('exist');
                    expectRegionEditingControls(false);

                    getIntervalAction('pin')
                        .should('have.class', 'cvat-audio-region-item-action-btn-disabled');
                    clickIntervalAction('pin');
                    getIntervalAction('pin').should('have.class', 'cvat-audio-region-item-action-btn-disabled');

                    getIntervalAction('hide')
                        .should('have.class', 'cvat-audio-region-item-action-btn-disabled');
                    clickIntervalAction('hide');
                    getIntervalAction('hide').should('have.class', 'cvat-audio-region-item-action-btn-disabled');

                    cy.get('body').type('{del}');
                    cy.get('.cvat-audio-region-item').should('have.length', 1);

                    cy.get('body').type('l');
                    getIntervalAction('lock').should('exist');
                    expectRegionEditingControls(true);
                });

                it('Pins an interval from its action and unpins it with P', () => {
                    createInterval(100, 250);
                    expectRegionEditingControls(true);

                    getIntervalAction('pin').find('.anticon-pushpin').invoke('html').then((outlinedMarkup) => {
                        clickIntervalAction('pin');
                        getIntervalAction('unpin')
                            .find('.anticon-pushpin').invoke('html').should('not.equal', outlinedMarkup);
                        expectRegionEditingControls(false);

                        cy.get('body').type('p');
                        getIntervalAction('pin').find('.anticon-pushpin').invoke('html').should('equal', outlinedMarkup);
                        expectRegionEditingControls(true);
                    });
                });

                it('Hides an interval from its action and shows it with H', () => {
                    createInterval(100, 250);

                    clickIntervalAction('hide');
                    cy.get('.cvat-audio-region-item').should('have.class', 'cvat-audio-region-item-hidden');
                    getIntervalAction('show').should('exist');
                    cy.getAudioRegion().should('not.exist');

                    cy.get('body').type('h');
                    cy.get('.cvat-audio-region-item').should('not.have.class', 'cvat-audio-region-item-hidden');
                    getIntervalAction('hide').should('exist');
                    cy.getAudioRegion().should('exist');
                });
            });
        });
    });
});
