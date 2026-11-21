
import React, { useEffect, useMemo, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getCore } from 'cvat-core-wrapper';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface AnnotationCount {
    class_name: string;
    count: number;
}

interface Props {
    taskId: number;
}

function AnnotationAnalytics({ taskId }: Readonly<Props>): JSX.Element {
    const [counts, setCounts] = useState<AnnotationCount[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllClasses, setShowAllClasses] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;

        async function loadAnalytics(): Promise<void> {
            setLoading(true);
            setError(null);

            try {
                const result = await getCore().tasks.annotationAnalytics(taskId);

                if (!cancelled) {
                    setCounts(result.counts);
                }
            } catch (requestError) {
                if (!cancelled) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : 'Failed to load annotation analytics.',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadAnalytics();

        return () => {
            cancelled = true;
        };
    }, [taskId]);

    const chartData = useMemo(() => {
        const sortedCounts = [...counts]
            .sort((first, second) => second.count - first.count);

        const displayedCounts = showAllClasses
            ? sortedCounts
            : sortedCounts.slice(0, 15);

        return {
            labels: displayedCounts.map((item) => item.class_name),
            datasets: [{
                label: 'Annotation count',
                data: displayedCounts.map((item) => item.count),
                backgroundColor: '#1890ff',
            }],
        };
    }, [counts, showAllClasses]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: showAllClasses
                    ? 'All Annotation Classes'
                    : 'Top 15 Annotation Classes',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className='cvat-annotation-analytics'>
            <h3>Annotation Analytics</h3>

            {loading && <p>Loading annotation analytics...</p>}

            {!loading && error && (
                <p role='alert'>Unable to load analytics: {error}</p>
            )}

            {!loading && !error && counts.length === 0 && (
                <p>No annotations available for this task.</p>
            )}

            {!loading && !error && counts.length > 0 && (
                <>
                    <p>Total classes: {counts.length}</p>

                    <div style={{ marginBottom: '16px' }}>
                        <button
                            type='button'
                            onClick={() => setShowAllClasses(false)}
                            disabled={!showAllClasses}
                        >
                            Top 15
                        </button>

                        {' '}

                        <button
                            type='button'
                            onClick={() => setShowAllClasses(true)}
                            disabled={showAllClasses}
                        >
                            All Classes
                        </button>
                    </div>

                    <div style={{ height: '350px', position: 'relative' }}>
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                </>
            )}
        </div>
    );
}

export default React.memo(AnnotationAnalytics);