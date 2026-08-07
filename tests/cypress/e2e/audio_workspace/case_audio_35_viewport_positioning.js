// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const_audio';

context('Audio annotation. Waveform viewport positioning.', { testIsolation: false }, () => {
    const caseId = 'audio_35';
    const WHEEL_DELTA_Y_PX = -8;
    const WHEEL_ZOOM_EVENT_COUNT = 5;
    const ZOOM_BASELINE_STEPS = 20;
    const ZOOM_ADJUSTMENT_STEPS = 20;
    const TIMESTAMP_TOLERANCE_FRACTION = 0.01;
    const CURSOR_POSITION_TOLERANCE_PX = 2;

    const getWaveformHost = () => cy.get('.cvat-audio-waveform-wrapper > div:first-child > div');
    const getScrollContainer = () => getWaveformHost().shadow().find('.scroll');
    const getCursor = () => getWaveformHost().shadow().find('.cursor');

    const scrollToOneThird = () => getScrollContainer().then(($scroll) => {
        const { clientWidth, scrollWidth } = $scroll[0];
        cy.wrap($scroll).scrollTo((scrollWidth - clientWidth) / 3, 0);
    });

    const seekAtViewportOffset = (offset) => getScrollContainer().then(($scroll) => {
        const { scrollLeft, clientWidth, clientHeight } = $scroll[0];
        getWaveformHost().shadow().find('.wrapper').click(
            scrollLeft + clientWidth * offset,
            clientHeight / 2,
            { force: true },
        );
    });

    const getViewportPosition = () => getScrollContainer().then(($scroll) => {
        const { scrollLeft, scrollWidth } = $scroll[0];
        return scrollLeft / scrollWidth;
    });

    const getCursorPosition = () => getScrollContainer().then(($scroll) => {
        const { scrollLeft } = $scroll[0];
        return getCursor().then(($cursor) => $cursor[0].offsetLeft - scrollLeft);
    });

    before(() => {
        cy.prepareUserSession();
        cy.openAudioJob(taskName);
    });

    beforeEach(() => {
        cy.viewport(1400, 900);
        cy.audioSliderSetValue('cvat-audio-zoom-control', '{home}', 1);
        cy.get('.cvat-audio-zoom-control .cvat-audio-slider-value-badge')
            .should('have.text', 'x1');
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Wheel zoom keeps the timestamp under the pointer fixed', () => {
            // x1 -> x3
            cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', ZOOM_BASELINE_STEPS);
            scrollToOneThird();

            getWaveformHost().then(($host) => {
                const rect = $host[0].getBoundingClientRect();
                const pointerOffset = rect.width * 0.25;
                getScrollContainer().then(($scroll) => {
                    const before = ($scroll[0].scrollLeft + pointerOffset) / $scroll[0].scrollWidth;
                    const beforeWidth = $scroll[0].scrollWidth;

                    for (let eventIndex = 0; eventIndex < WHEEL_ZOOM_EVENT_COUNT; eventIndex += 1) {
                        $host[0].dispatchEvent(new WheelEvent('wheel', {
                            bubbles: true,
                            cancelable: true,
                            clientX: rect.left + pointerOffset,
                            clientY: rect.top + rect.height / 2,
                            deltaY: WHEEL_DELTA_Y_PX,
                        }));
                    }

                    getScrollContainer().should(($updatedScroll) => {
                        expect($updatedScroll[0].scrollWidth).to.be.greaterThan(beforeWidth);
                        const after = ($updatedScroll[0].scrollLeft + pointerOffset) / $updatedScroll[0].scrollWidth;
                        expect(after).to.be.closeTo(before, TIMESTAMP_TOLERANCE_FRACTION);
                    });
                });
            });
        });

        it('Window resizing preserves the leftmost visible timestamp', () => {
            const RESIZED_SCROLL_WIDTH_UPPER_BOUND_PX = 700;
            // x1 -> x3
            cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', ZOOM_BASELINE_STEPS);
            scrollToOneThird();

            getViewportPosition().then((before) => {
                cy.viewport(1000, 700);
                getScrollContainer().should(($updatedScroll) => {
                    expect($updatedScroll[0].clientWidth).to.be.at.most(RESIZED_SCROLL_WIDTH_UPPER_BOUND_PX);
                    const after = $updatedScroll[0].scrollLeft / $updatedScroll[0].scrollWidth;
                    expect(after).to.be.closeTo(before, TIMESTAMP_TOLERANCE_FRACTION);
                });
            });
        });

        it('Slider zoom preserves a visible playback cursor position', () => {
            // x1 -> x3
            cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', ZOOM_BASELINE_STEPS);
            scrollToOneThird();
            seekAtViewportOffset(0.6);

            getCursorPosition().then((before) => {
                getScrollContainer().then(($scroll) => {
                    const beforeWidth = $scroll[0].scrollWidth;
                    // x3 -> x5
                    cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', ZOOM_ADJUSTMENT_STEPS);
                    getScrollContainer().should(($updatedScroll) => {
                        expect($updatedScroll[0].scrollWidth).to.be.greaterThan(beforeWidth);
                    });
                });
                getCursorPosition().should('be.closeTo', before, CURSOR_POSITION_TOLERANCE_PX);

                // x5 -> x3
                cy.audioSliderSetValue('cvat-audio-zoom-control', '{uparrow}', ZOOM_ADJUSTMENT_STEPS);
                getCursorPosition().should('be.closeTo', before, CURSOR_POSITION_TOLERANCE_PX);
            });
        });

        it('Slider zoom preserves the leftmost timestamp when the playback cursor is hidden', () => {
            seekAtViewportOffset(0);
            // x1 -> x3
            cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', ZOOM_BASELINE_STEPS);
            scrollToOneThird();

            getViewportPosition().then((before) => {
                getScrollContainer().then(($scroll) => {
                    const beforeWidth = $scroll[0].scrollWidth;
                    // x3 -> x5
                    cy.audioSliderSetValue('cvat-audio-zoom-control', '{downarrow}', ZOOM_ADJUSTMENT_STEPS);
                    getScrollContainer().should(($updatedScroll) => {
                        expect($updatedScroll[0].scrollWidth).to.be.greaterThan(beforeWidth);
                    });
                });
                getViewportPosition().should('be.closeTo', before, TIMESTAMP_TOLERANCE_FRACTION);

                // x5 -> x3
                cy.audioSliderSetValue('cvat-audio-zoom-control', '{uparrow}', ZOOM_ADJUSTMENT_STEPS);
                getViewportPosition().should('be.closeTo', before, TIMESTAMP_TOLERANCE_FRACTION);
            });
        });
    });
});
