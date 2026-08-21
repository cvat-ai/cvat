// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import classNames from 'classnames';

/** Distinguishes creating an interval playback range from ordinary playback. */
export default function AudioIntervalPlayIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
    return (
        <svg {...props} className={classNames('cvat-audio-interval-play-icon', props.className)} viewBox='0 0 24 16' fill='none' aria-hidden>
            <path d='M4 2V14M4 2H8M4 14H8M20 2V14M20 2H16M20 14H16' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' />
            <path d='M9 4.2L16.5 8L9 11.8V4.2Z' fill='currentColor' />
        </svg>
    );
}
