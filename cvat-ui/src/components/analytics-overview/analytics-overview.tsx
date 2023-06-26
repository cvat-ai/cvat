// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { AnalyticsReport, AnalyticsEntryViewType } from 'cvat-core-wrapper';
import moment from 'moment';
import HistogramView from './histogram-view';

interface Props {
    report: AnalyticsReport | null;
}

function AnalyticsOverview(props: Props): JSX.Element | null {
    const { report } = props;

    // TODO make it more expressive
    if (!report) return null;

    const views = Object.entries(report.statistics).map(([name, entry]) => {
        switch (entry.defaultView) {
            case AnalyticsEntryViewType.NUMERIC: {
                return <div key={name}>numeric</div>;
            }
            case AnalyticsEntryViewType.HISTOGRAM: {
                const firstDataset = Object.keys(entry.dataseries)[0];
                const dateLabels = entry.dataseries[firstDataset].map((dataEntry) => (
                    moment.utc(dataEntry.datetime).local().format('YYYY-MM-DD HH:mm:ss')
                ));

                const datasets = Object.entries(entry.dataseries).map(([key, series]) => {
                    let label = key.split('_').join(' ');
                    label = label.charAt(0).toUpperCase() + label.slice(1);

                    const data = series.map((s) => {
                        if (Number.isFinite(s.value)) {
                            return s.value;
                        }

                        if (typeof s.value === 'object') {
                            return Object.keys(s.value).reduce((acc, key) => acc + s.value[key], 0);
                        }
                    });

                    return {
                        label,
                        data,
                        // Just random now
                        // eslint-disable-next-line no-bitwise
                        backgroundColor: `#${(Math.random() * 0xFFFFFF << 0).toString(16)}`,
                    };
                });
                return (
                    <HistogramView
                        datasets={datasets}
                        labels={dateLabels}
                        title={entry.title}
                        key={name}
                    />
                );
            }
            default: {
                throw Error(`View type ${entry.defaultView} is not supported`);
            }
        }
    });

    return (
        <div className='cvat-analytics-overview'>
            {views}
        </div>
    );
}

export default React.memo(AnalyticsOverview);
