// SPDX-License-Identifier: MIT

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, BarElement, CategoryScale, ChartDataset, Legend, LinearScale, Tooltip,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

export interface LabelCount {
    label_id: number;
    name: string;
    color: string;
    count: number;
    shape_types?: Record<string, number>;
}

const BAR_HEIGHT_PX = 22;
const MIN_CHART_HEIGHT_PX = 200;
const DEFAULT_BAR_COLOR = '#1890ff';

// Each shape type always keeps the same colour. The colours were checked to stay
// distinguishable for colour-blind readers; tracks and tags share one grey.
const SHAPE_TYPES = [
    { key: 'rectangle', name: 'Rectangle (box)', color: '#2a78d6' },
    { key: 'polygon', name: 'Polygon', color: '#eb6834' },
    { key: 'polyline', name: 'Polyline', color: '#1baf7a' },
    { key: 'points', name: 'Points', color: '#eda100' },
    { key: 'ellipse', name: 'Ellipse', color: '#e87ba4' },
    { key: 'cuboid', name: 'Cuboid', color: '#008300' },
    { key: 'mask', name: 'Mask', color: '#4a3aa7' },
    { key: 'skeleton', name: 'Skeleton', color: '#e34948' },
    { key: 'other', name: 'Tracks and tags', color: '#8c8c8c' },
];

function shapeTypeDatasets(labels: LabelCount[]): ChartDataset<'bar'>[] {
    return SHAPE_TYPES
        .filter(({ key }) => labels.some((label) => label.shape_types?.[key]))
        .map(({ key, name, color }) => ({
            label: name,
            data: labels.map((label) => label.shape_types?.[key] ?? 0),
            backgroundColor: color,
            borderColor: '#ffffff',
            borderWidth: 1,
        }));
}

interface Props {
    labels: LabelCount[];
    byShapeType: boolean;
}

function AnnotationCountsChart({ labels, byShapeType }: Props): JSX.Element {
    // Horizontal bars keep long label names readable, so the chart grows with the number of labels
    const height = Math.max(labels.length * BAR_HEIGHT_PX, MIN_CHART_HEIGHT_PX);

    const datasets: ChartDataset<'bar'>[] = byShapeType ? shapeTypeDatasets(labels) : [{
        label: 'Annotations',
        data: labels.map((label) => label.count),
        backgroundColor: labels.map((label) => label.color || DEFAULT_BAR_COLOR),
    }];

    return (
        <div className='cvat-annotation-counts-chart' style={{ height }}>
            <Bar
                data={{ labels: labels.map((label) => label.name), datasets }}
                options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: byShapeType, beginAtZero: true, ticks: { precision: 0 } },
                        y: { stacked: byShapeType, ticks: { autoSkip: false } },
                    },
                    plugins: {
                        legend: { display: byShapeType, position: 'top' },
                    },
                }}
            />
        </div>
    );
}

export default React.memo(AnnotationCountsChart);
