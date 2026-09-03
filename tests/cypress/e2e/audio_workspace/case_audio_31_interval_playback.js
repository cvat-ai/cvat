// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, firstLabelName } from '../../support/const_audio';

context('Audio annotation. Interval playback behavior.', () => {
    const caseId = 'audio_31';
    const CURSOR_TOLERANCE_PX = 6;

    beforeEach(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    afterEach(() => {
        cy.audioClearAnnotations();
    });

    const createShortInterval = (start = 100, end = 112) => {
        cy.audioCreateRegionViaButton(firstLabelName, start, end);
        cy.get('.cvat-audio-region-item').should('have.length', 1);
    };

    const expectCursorAtIntervalEnd = () => {
        cy.getAudioWaveformCursor().then(($cursor) => {
            cy.getAudioRegion().should('have.length', 1).then(($region) => {
                const cursor = $cursor[0].getBoundingClientRect();
                const region = $region[0].getBoundingClientRect();

                expect(cursor.left).to.be.closeTo(region.right, CURSOR_TOLERANCE_PX);
            });
        });
    };

    const getIntervalBounds = () => cy.getAudioRegion().should('have.length', 1).then(($region) => {
        const bounds = $region[0].getBoundingClientRect();
        return { left: bounds.left, right: bounds.right };
    });

    const getCursorPosition = () => cy.getAudioWaveformCursor().then(($cursor) => (
        $cursor[0].getBoundingClientRect().left
    ));

    const dragIntervalEndTo = (positionX) => {
        cy.getAudioRegionHandle('right').then(($handle) => {
            cy.getAudioWaveformViewport().then(($viewport) => {
                const viewport = $viewport[0].getBoundingClientRect();
                const handle = $handle[0].getBoundingClientRect();
                const targetY = handle.top - viewport.top + handle.height / 2;

                cy.wrap($handle).realMouseDown({
                    position: 'center',
                    button: 'left',
                    scrollBehavior: false,
                });
                cy.wrap($viewport).realMouseMove(positionX - viewport.left, targetY, {
                    scrollBehavior: false,
                });
                cy.wrap($viewport).realMouseUp({ button: 'left', scrollBehavior: false });
            });
        });
    };

    const seekWaveformAt = (positionX) => {
        cy.getAudioWaveformViewport().then(($viewport) => {
            const viewport = $viewport[0].getBoundingClientRect();
            cy.clickRegionOnWaveform(positionX - viewport.left);
        });
    };

    const seekMinimapAt = (fraction) => {
        cy.get('#minimap').then(($minimap) => {
            const minimap = $minimap[0].getBoundingClientRect();
            cy.wrap($minimap).realClick({
                x: minimap.width * fraction,
                y: minimap.height / 2,
                scrollBehavior: false,
            });
        });
    };

    const seekWithinInterval = (source) => {
        getIntervalBounds().then(({ left, right }) => {
            if (source === 'waveform') {
                seekWaveformAt(left + (right - left) / 2);
                return;
            }

            cy.getAudioWaveformViewport().then(($viewport) => {
                const viewport = $viewport[0].getBoundingClientRect();
                const position = (left + (right - left) / 2 - viewport.left) / viewport.width;
                seekMinimapAt(position);
            });
        });
    };

    const seekOutsideInterval = (source) => {
        if (source === 'waveform') {
            cy.getAudioWaveformViewport().then(($viewport) => {
                const viewport = $viewport[0].getBoundingClientRect();
                seekWaveformAt(viewport.left + viewport.width * 0.9);
            });
            return;
        }

        seekMinimapAt(0.9);
    };

    const expectCursorWithinInterval = () => {
        cy.getAudioWaveformCursor().then(($cursor) => {
            cy.getAudioRegion().should('have.length', 1).then(($region) => {
                const cursor = $cursor[0].getBoundingClientRect();
                const region = $region[0].getBoundingClientRect();

                expect(cursor.left).to.be.at.least(region.left - CURSOR_TOLERANCE_PX);
                expect(cursor.left).to.be.at.most(region.right + CURSOR_TOLERANCE_PX);
            });
        });
    };

    describe(`Testing case "${caseId}"`, () => {
        it('Plays an interval once from a sidebar double-click', () => {
            createShortInterval();
            cy.get('.cvat-audio-region-item').first()
                .find('.cvat-audio-interval-header-index').dblclick();

            cy.get('.cvat-player-pause-button').should('exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
            expectCursorAtIntervalEnd();
        });

        it('Plays an interval once from a canvas double-click', () => {
            createShortInterval();
            cy.doubleClickRegionOnWaveform(106);

            cy.get('.cvat-audio-region-item').first().should('have.class', 'cvat-audio-region-item-active');
            cy.get('.cvat-player-pause-button').should('exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
            expectCursorAtIntervalEnd();
        });

        it('Preserves play-once bounds across pause and resume', () => {
            createShortInterval();
            cy.get('.cvat-audio-region-item').first()
                .find('.cvat-audio-interval-header-index').dblclick();
            cy.get('.cvat-player-pause-button').should('exist').click();
            cy.get('.cvat-player-play-button').should('exist').click();

            cy.get('.cvat-player-pause-button').should('exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
            expectCursorAtIntervalEnd();
        });

        it('Loops a playing interval range', () => {
            createShortInterval();

            cy.get('.cvat-audio-loop-control').click();
            cy.get('.cvat-audio-loop-control').should('have.class', 'cvat-active-canvas-control');
            cy.get('.cvat-audio-region-item').first().dblclick();

            cy.wait(6000);
            cy.get('.cvat-player-pause-button').should('exist');
            expectCursorWithinInterval();

            cy.get('.cvat-player-pause-button').click();
        });

        it('Continues playback past the old end when the active interval is extended', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 130);
            getIntervalBounds().then(({ right: previousEnd }) => {
                cy.get('.cvat-audio-region-item').first().dblclick();
                cy.getAudioWaveformViewport().then(($viewport) => {
                    const viewport = $viewport[0].getBoundingClientRect();
                    const newEnd = Math.min(previousEnd + 50, viewport.right - 40);

                    expect(newEnd).to.be.greaterThan(previousEnd + CURSOR_TOLERANCE_PX);
                    dragIntervalEndTo(newEnd);
                });

                cy.getAudioRegion().should(($region) => {
                    expect($region[0].getBoundingClientRect().right).to.be.greaterThan(
                        previousEnd + CURSOR_TOLERANCE_PX,
                    );
                });
                cy.getAudioWaveformCursor().should(($cursor) => {
                    expect($cursor[0].getBoundingClientRect().left).to.be.greaterThan(
                        previousEnd + CURSOR_TOLERANCE_PX,
                    );
                });
                cy.get('.cvat-player-pause-button').should('exist');
                cy.get('.cvat-player-play-button', { timeout: 12000 }).should('exist');
                expectCursorAtIntervalEnd();
            });
        });

        it('Stops and clears playback when the active interval is shrunk behind the playhead', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 180);
            getIntervalBounds().then(({ left }) => {
                cy.get('.cvat-audio-region-item').first().dblclick();
                cy.getAudioWaveformCursor().should(($cursor) => {
                    expect($cursor[0].getBoundingClientRect().left).to.be.greaterThan(left + 15);
                });

                getCursorPosition().then((cursorPosition) => {
                    dragIntervalEndTo(cursorPosition - 8);
                });
            });

            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
            getCursorPosition().then((stoppedPosition) => {
                cy.get('.cvat-player-play-button').click();
                cy.getAudioWaveformCursor().should(($cursor) => {
                    expect($cursor[0].getBoundingClientRect().left).to.be.greaterThan(
                        stoppedPosition + CURSOR_TOLERANCE_PX,
                    );
                });
                cy.get('.cvat-player-pause-button').click();
            });
        });

        it('Stops interval playback when its source interval is deleted', () => {
            cy.audioCreateRegionViaButton(firstLabelName, 100, 180);
            cy.get('.cvat-audio-region-item').first().dblclick();
            cy.get('.cvat-player-pause-button').should('exist');

            cy.get('body').type('{del}');
            cy.get('.cvat-audio-region-item').should('not.exist');
            cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
        });

        ['waveform', 'minimap'].forEach((source) => {
            it(`Preserves an interval range when seeking within it by ${source}`, () => {
                cy.audioCreateRegionViaButton(firstLabelName, 100, 180);
                cy.get('.cvat-audio-region-item').first().dblclick();
                cy.get('.cvat-player-pause-button').should('exist');

                seekWithinInterval(source);
                cy.get('.cvat-player-pause-button').should('exist');
                cy.get('.cvat-player-play-button', { timeout: 12000 }).should('exist');
                expectCursorAtIntervalEnd();
            });

            it(`Cancels an interval range when seeking outside it by ${source}`, () => {
                cy.audioCreateRegionViaButton(firstLabelName, 100, 130);
                cy.get('.cvat-audio-region-item').first().dblclick();
                cy.get('.cvat-player-pause-button').should('exist');

                seekOutsideInterval(source);
                cy.get('.cvat-player-play-button', { timeout: 8000 }).should('exist');
            });
        });
    });
});
