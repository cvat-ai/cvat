// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getCore } from 'cvat-core-wrapper';

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
            <table>
                <thead>
                    <tr>
                        <th>Class</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {counts.map(({ label, count }) => (
                        <tr key={label}>
                            <td>{label}</td>
                            <td>{count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AnnotationAnalyticsPage;
