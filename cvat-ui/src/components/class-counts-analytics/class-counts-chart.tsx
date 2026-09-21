// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Bar chart component for class-wise annotation counts.
 *
 * Uses react-chartjs-2 + chart.js (already in cvat-ui dependencies).
 * Two bar groups per label:
 *   - Solid fill: distinct image/frame count
 *   - Translucent fill: total annotation count
 *
 * Label colors come from the CVAT label data.
 */

import React, { memo, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions,
    ChartData,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { ClassCountItem } from './use-class-counts-ws';

// Register Chart.js components (idempotent — safe to call multiple times)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ClassCountsChartProps {
    counts: ClassCountItem[];
    loading: boolean;
}

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 100;
    const g = parseInt(clean.substring(2, 4), 16) || 100;
    const b = parseInt(clean.substring(4, 6), 16) || 100;
    return `rgba(${r},${g},${b},${alpha})`;
}

function ClassCountsChart({ counts, loading }: ClassCountsChartProps): JSX.Element {
    const chartData: ChartData<'bar'> = useMemo(
        () => ({
            labels: counts.map((c) => c.label_name),
            datasets: [
                {
                    label: 'Distinct frames (images)',
                    data: counts.map((c) => c.image_count),
                    backgroundColor: counts.map((c) => hexToRgba(c.color, 0.85)),
                    borderColor: counts.map((c) => hexToRgba(c.color, 1)),
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'Total annotations',
                    data: counts.map((c) => c.annotation_count),
                    backgroundColor: counts.map((c) => hexToRgba(c.color, 0.35)),
                    borderColor: counts.map((c) => hexToRgba(c.color, 0.7)),
                    borderWidth: 1,
                    borderRadius: 4,
                },
            ],
        }),
        [counts],
    );

    const options: ChartOptions<'bar'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top' as const,
                    labels: {
                        color: '#ccc',
                        font: { size: 13 },
                    },
                },
                title: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: '#1f1f2e',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: '#444',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`,
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: '#ccc',
                        maxRotation: 35,
                        minRotation: 0,
                    },
                    grid: { color: '#2e2e3e' },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#ccc', precision: 0 },
                    grid: { color: '#2e2e3e' },
                },
            },
        }),
        [],
    );

    if (loading) {
        return (
            <div className='cvat-class-counts-empty'>
                <p>Loading chart data…</p>
            </div>
        );
    }

    if (counts.length === 0) {
        return (
            <div className='cvat-class-counts-empty'>
                <p>No labels found for the selected scope.</p>
            </div>
        );
    }

    return (
        <div className='cvat-class-counts-chart-wrapper'>
            <Bar data={chartData} options={options} />
        </div>
    );
}

export default memo(ClassCountsChart);
