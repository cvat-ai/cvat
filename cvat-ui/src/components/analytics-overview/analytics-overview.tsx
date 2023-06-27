// Copyright (C) 2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Tabs from 'antd/lib/tabs';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Spin from 'antd/lib/spin';
import Button from 'antd/lib/button';
import notification from 'antd/lib/notification';
import { LeftOutlined } from '@ant-design/icons/lib/icons';
import { useIsMounted } from 'utils/hooks';
import { Project } from 'reducers';
import { AnalyticsReport, AnalyticsEntry, AnalyticsEntryViewType } from 'cvat-core-wrapper';

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
                return <div key={name}>histogram</div>;
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
