// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
    Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BAR_HEIGHT = 22;
const CHART_PADDING = 40;
const FALLBACK_COLOR = '#bfbfbf';

interface Props {
    labels: {
        id: number;
        name: string;
        color: string;
        count: number;
    }[];
}

interface TextStyle {
    color: string;
    family: string;
}

function LabelCountsChart(props: Props): JSX.Element {
    const { labels } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const [textStyle, setTextStyle] = useState<TextStyle | null>(null);

    useLayoutEffect(() => {
        if (containerRef.current) {
            const { color, fontFamily } = getComputedStyle(containerRef.current);
            setTextStyle({ color, family: fontFamily });
        }
    }, []);

    const options = useMemo((): ChartOptions<'bar'> => {
        const font = textStyle ? { family: textStyle.family } : undefined;
        return {
            indexAxis: 'y',
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { titleFont: font, bodyFont: font },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: textStyle?.color, font },
                },
                y: {
                    ticks: { color: textStyle?.color, font },
                },
            },
        };
    }, [textStyle]);

    const data = {
        labels: labels.map((label) => label.name),
        datasets: [{
            data: labels.map((label) => label.count),
            backgroundColor: labels.map((label) => label.color || FALLBACK_COLOR),
        }],
    };

    return (
        <div
            className='cvat-label-counts-chart cvat-text-color'
            ref={containerRef}
            style={{ height: labels.length * BAR_HEIGHT + CHART_PADDING }}
        >
            <Bar options={options} data={data} />
        </div>
    );
}

export default React.memo(LabelCountsChart);
