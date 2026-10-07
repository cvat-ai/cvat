// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
    BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getCore } from 'cvat-core-wrapper';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AnnotationCount {
    label: string;
    count: number;
}

const core = getCore();

function AnnotationAnalyticsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const [counts, setCounts] = useState<AnnotationCount[]>([]);

    useEffect(() => {
        const taskID = Number(tid);
        core.server.request(
            `${core.config.backendAPI}/test/tasks/${taskID}/annotation-counts`,
            { method: 'GET' },
        ).then((response: { data: { counts: AnnotationCount[] } }) => {
            setCounts(response.data.counts);
        });
    }, [tid]);

    return (
        <div style={{ padding: 24 }}>
            <h1>Annotation analytics</h1>
            <div style={{ height: Math.max(400, counts.length * 24) }}>
                <Bar
                    data={{
                        labels: counts.map(({ label }) => label),
                        datasets: [{
                            label: 'Annotations',
                            data: counts.map(({ count }) => count),
                        }],
                    }}
                    options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Annotation count',
                                },
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Class',
                                },
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
}

export default AnnotationAnalyticsPage;
