// Copyright (C) 2023-2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import moment from 'moment';
import RGL, { WidthProvider } from 'react-grid-layout';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import Notification from 'antd/lib/notification';
import { AnalyticsReport, AnalyticsEntryViewType } from 'cvat-core-wrapper';
import { Col, Row } from 'antd/lib/grid';
import HistogramView from './views/histogram-view';
import AnalyticsCard from './views/analytics-card';

const ReactGridLayout = WidthProvider(RGL);

export enum DateIntervals {
    LAST_WEEK = 'Last 7 days',
    LAST_MONTH = 'Last 30 days',
    LAST_QUARTER = 'Last 90 days',
    LAST_YEAR = 'Last year',
}

interface Props {
    report: AnalyticsReport | null;
    timePeriod: DateIntervals;
    onTimePeriodChange: (val: DateIntervals) => void;
}

const colors = [
    'rgba(255, 99, 132, 0.5)',
    'rgba(53, 162, 235, 0.5)',
    'rgba(170, 83, 85, 0.5)',
    'rgba(44, 70, 94, 0.5)',
    'rgba(28, 66, 98, 0.5)',
];

function AnalyticsOverview(props: Props): JSX.Element | null {
    const { report, timePeriod, onTimePeriodChange } = props;

    if (!report) return null;
    const layout: any = [];
    let histogramCount = 0;
    let numericCount = 0;
    const views: { view: React.JSX.Element, key: string }[] = [];
    report.statistics.forEach((entry) => {
        const tooltip = (
            <div className='cvat-analytics-tooltip-inner'>
                <Text>
                    {entry.description}
                </Text>
            </div>
        );
        switch (entry.defaultView) {
            case AnalyticsEntryViewType.NUMERIC: {
                layout.push({
                    i: entry.name,
                    w: 2,
                    h: 1,
                    x: 2,
                    y: numericCount,
                });
                numericCount += 1;
                const { value } = entry.dataSeries[Object.keys(entry.dataSeries)[0]][0];

                views.push({
                    view: (
                        <AnalyticsCard
                            title={entry.title}
                            tooltip={tooltip}
                            value={typeof value === 'number' ? value.toFixed(1) : 0}
                            key={entry.name}
                            entryName={entry.name}
                        />
                    ),
                    key: entry.name,
                });
                break;
            }
            case AnalyticsEntryViewType.HISTOGRAM: {
                const firstDataset = Object.keys(entry.dataSeries)[0];
                const dateLabels = entry.dataSeries[firstDataset].map((dataEntry) => (
                    moment.utc(dataEntry.date).local().format('YYYY-MM-DD')
                ));

                const { dataSeries } = entry;
                let colorIndex = -1;
                const datasets = Object.entries(dataSeries).map(([key, series]) => {
                    let label = key.split('_').join(' ');
                    label = label.charAt(0).toUpperCase() + label.slice(1);

                    const data: number[] = series.map((s) => {
                        if (typeof s.value === 'number') {
                            return s.value as number;
                        }

                        if (typeof s.value === 'object') {
                            return Object.keys(s.value).reduce((acc, k) => acc + s.value[k], 0);
                        }

                        return 0;
                    });

                    colorIndex = colorIndex >= colors.length - 1 ? 0 : colorIndex + 1;
                    return {
                        label,
                        data,
                        backgroundColor: colors[colorIndex],
                    };
                });
                layout.push({
                    i: entry.name,
                    h: 1,
                    w: 2,
                    x: 0,
                    y: histogramCount,
                });
                histogramCount += 1;
                views.push({
                    view: (
                        <HistogramView
                            datasets={datasets}
                            labels={dateLabels}
                            title={entry.title}
                            key={entry.name}
                            entryName={entry.name}
                        />
                    ),
                    key: entry.name,
                });
                break;
            }
            default: {
                Notification.warning({
                    message: `Cannot display analytics view with view type ${entry.defaultView}`,
                });
            }
        }
    });
    return (
        <div className='cvat-analytics-overview'>
            <Row justify='space-between'>
                <Col>
                    <Text type='secondary'>
                        {`Created ${report?.createdDate ? moment(report?.createdDate).fromNow() : ''}`}
                    </Text>
                </Col>
                <Col>
                    <Select
                        placeholder='Select time period'
                        value={timePeriod}
                        onChange={onTimePeriodChange}
                        options={[
                            {
                                value: DateIntervals.LAST_WEEK,
                                label: DateIntervals.LAST_WEEK,
                            },
                            {
                                value: DateIntervals.LAST_MONTH,
                                label: DateIntervals.LAST_MONTH,
                            },
                            {
                                value: DateIntervals.LAST_QUARTER,
                                label: DateIntervals.LAST_QUARTER,
                            },
                            {
                                value: DateIntervals.LAST_YEAR,
                                label: DateIntervals.LAST_YEAR,
                            },
                        ]}
                    />
                </Col>
            </Row>
            <ReactGridLayout
                className='layout'
                layout={layout}
                cols={4}
                rowHeight={200}
            >

                { views.map(({ view, key }): JSX.Element => (
                    <div
                        key={key}
                    >
                        { view }
                    </div>
                )) }
            </ReactGridLayout>
        </div>
    );
}

export default React.memo(AnalyticsOverview);
