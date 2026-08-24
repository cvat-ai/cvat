// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import classNames from 'classnames';

interface Props extends React.SVGProps<SVGSVGElement> {
    boundary: 'start' | 'end';
}

export default function AudioIntervalPlaybackIcon({ boundary, ...props }: Props): JSX.Element {
    const isStart = boundary === 'start';

    return (
        <svg
            {...props}
            className={classNames('cvat-audio-interval-playback-icon', props.className)}
            viewBox='0 0 20 16'
            fill='none'
            aria-hidden
        >
            {isStart ? (
                <>
                    <path
                        d='M6 2H3V14H6'
                        stroke='currentColor'
                        strokeWidth='1.7'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    />
                    <path d='M13.5 4.2L6 8L13.5 11.8V4.2Z' fill='currentColor' />
                </>
            ) : (
                <>
                    <path d='M6.5 4.2L14 8L6.5 11.8V4.2Z' fill='currentColor' />
                    <path
                        d='M14 2H17V14H14'
                        stroke='currentColor'
                        strokeWidth='1.7'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    />
                </>
            )}
        </svg>
    );
}
