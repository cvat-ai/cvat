// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022-2023 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';
import { TasksQuery, CombinedState } from 'reducers';
import TasksPageComponent from 'components/tasks-page/tasks-page';

interface StateToProps {
    fetching: boolean;
    query: TasksQuery;
    count: number;
    importing: boolean;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { tasks } = state;

    return {
        fetching: state.tasks.fetching,
        query: tasks.gettingQuery,
        count: state.tasks.count,
        importing: state.import.tasks.backup.importing,
    };
}

export default connect(mapStateToProps)(TasksPageComponent);
