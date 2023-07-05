// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import moment from 'moment';
import RGL, { WidthProvider } from 'react-grid-layout';
import Text from 'antd/lib/typography/Text';
import Select from 'antd/lib/select';
import { AnalyticsReport, AnalyticsEntryViewType } from 'cvat-core-wrapper';
import { Col, Row } from 'antd/lib/grid';
import HistogramView from './views/histogram-view';
import AnalyticsCard from './views/analytics-card';

const ReactGridLayout = WidthProvider(RGL);

export enum DateIntervals {
    LAST_WEEK = 'Last 7 days',
    LAST_MONTH = 'Last 30 days',
    LAST_QUARTER = 'Last 90 days',
    LAST_YEAR = 'Last 365 days',
}

interface Props {
    report: AnalyticsReport | null;
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
    const { report, onTimePeriodChange } = props;

    // TODO make it more expressive
    if (!report) return null;
    const layout: any = [];
    let histogramCount = 0;
    let numericCount = 0;
    const views = Object.entries(report.statistics).map(([name, entry]) => {
        switch (entry.defaultView) {
            case AnalyticsEntryViewType.NUMERIC: {
                layout.push({
                    i: name,
                    w: 2,
                    h: 1,
                    x: 2,
                    y: numericCount,
                });
                numericCount += 1;
                const { value } = entry.dataseries[Object.keys(entry.dataseries)[0]][0];
                return ({
                    view: (
                        <AnalyticsCard
                            title={entry.title}
                            value={typeof value === 'number' ? value.toFixed(2) : 0}
                            bottomElement={<Text>{entry.description}</Text>}
                            key={name}
                        />
                    ),
                    key: name,
                });
            }
            case AnalyticsEntryViewType.HISTOGRAM: {
                const firstDataset = Object.keys(entry.dataseries)[0];
                const dateLabels = entry.dataseries[firstDataset].map((dataEntry) => (
                    moment.utc(dataEntry.date).local().format('YYYY-MM-DD')
                ));

                const { dataseries } = entry;
                entry.transformations.forEach((transform) => {
                    if (transform.binary) {
                        let operator: (left: number, right: number) => number;
                        switch (transform.binary.operator) {
                            case '+': {
                                operator = (left: number, right: number) => left + right;
                                break;
                            }
                            case '-': {
                                operator = (left: number, right: number) => left - right;
                                break;
                            }
                            case '*': {
                                operator = (left: number, right: number) => left * right;
                                break;
                            }
                            case '/': {
                                operator = (left: number, right: number) => (right !== 0 ? left / right : 0);
                                break;
                            }
                            default: {
                                throw Error(`Operator type ${transform.binary.operator} is not supported`);
                            }
                        }

                        const leftName = transform.binary.left;
                        const rightName = transform.binary.right;
                        if (Object.hasOwn(dataseries, leftName) && Object.hasOwn(dataseries, rightName)) {
                            dataseries[transform.name] = dataseries[leftName].map((left, i) => {
                                const right = dataseries[rightName][i];
                                if (typeof left.value === 'number' && typeof right.value === 'number') {
                                    return {
                                        value: operator(left.value, right.value),
                                        date: left.date,
                                    };
                                }
                                return {
                                    value: 0,
                                    date: left.date,
                                };
                            });
                            delete dataseries[leftName];
                            delete dataseries[rightName];
                        }
                    }
                });

                let colorIndex = -1;
                const datasets = Object.entries(dataseries).map(([key, series]) => {
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
                    i: name,
                    h: 1,
                    w: 2,
                    x: 0,
                    y: histogramCount,
                });
                histogramCount += 1;
                return ({
                    view: (
                        <HistogramView
                            datasets={datasets}
                            labels={dateLabels}
                            title={entry.title}
                            key={name}
                        />
                    ),
                    key: name,
                });
            }
            default: {
                throw Error(`View type ${entry.defaultView} is not supported`);
            }
        }
    });
    return (
        <div className='cvat-analytics-overview'>
            <Row justify='end'>
                <Col>
                    <Select
                        placeholder='Select time period'
                        defaultValue={DateIntervals.LAST_WEEK}
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
