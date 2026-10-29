// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
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

const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
    },
    scales: {
        x: {
            beginAtZero: true,
            ticks: { precision: 0 },
        },
    },
};

function LabelCountsChart(props: Props): JSX.Element {
    const { labels } = props;

    const data = {
        labels: labels.map((label) => label.name),
        datasets: [{
            data: labels.map((label) => label.count),
            backgroundColor: labels.map((label) => label.color || FALLBACK_COLOR),
        }],
    };

    return (
        <div
            className='cvat-label-counts-chart'
            style={{ height: labels.length * BAR_HEIGHT + CHART_PADDING }}
        >
            <Bar options={options} data={data} />
        </div>
    );
}

export default React.memo(LabelCountsChart);
