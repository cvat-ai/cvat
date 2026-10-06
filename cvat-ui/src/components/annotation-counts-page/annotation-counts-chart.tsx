// SPDX-License-Identifier: MIT

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export interface LabelCount {
    label_id: number;
    name: string;
    color: string;
    count: number;
}

const BAR_HEIGHT_PX = 22;
const MIN_CHART_HEIGHT_PX = 200;
const DEFAULT_BAR_COLOR = '#1890ff';

interface Props {
    labels: LabelCount[];
}

function AnnotationCountsChart({ labels }: Props): JSX.Element {
    // Horizontal bars keep long label names readable, so the chart grows with the number of labels
    const height = Math.max(labels.length * BAR_HEIGHT_PX, MIN_CHART_HEIGHT_PX);

    return (
        <div className='cvat-annotation-counts-chart' style={{ height }}>
            <Bar
                data={{
                    labels: labels.map((label) => label.name),
                    datasets: [{
                        label: 'Annotations',
                        data: labels.map((label) => label.count),
                        backgroundColor: labels.map((label) => label.color || DEFAULT_BAR_COLOR),
                    }],
                }}
                options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    scales: {
                        x: { beginAtZero: true, ticks: { precision: 0 } },
                        y: { ticks: { autoSkip: false } },
                    },
                }}
            />
        </div>
    );
}

export default React.memo(AnnotationCountsChart);
