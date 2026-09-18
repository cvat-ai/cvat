// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BAR_COLOR = '#1890ff';

interface Props {
    counts: Record<string, number>;
}

export default function ClassCountsChart(props: Readonly<Props>): JSX.Element {
    const { counts } = props;
    const labels = Object.keys(counts);
    const values = Object.values(counts);

    return (
        <Bar
            data={{
                labels,
                datasets: [{
                    label: 'Annotated images',
                    data: values,
                    backgroundColor: BAR_COLOR,
                    borderRadius: 4,
                    maxBarThickness: 64,
                }],
            }}
            options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context: TooltipItem<'bar'>) => {
                                const value = context.parsed.y;
                                return `${value} image${value === 1 ? '' : 's'}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Label' },
                    },
                    y: {
                        title: { display: true, text: 'Annotated images' },
                        beginAtZero: true,
                        ticks: { precision: 0 },
                    },
                },
            }}
        />
    );
}
