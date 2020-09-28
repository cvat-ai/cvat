// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { connect } from 'react-redux';

import {
    ProjectsQuery,
    CombinedState,
} from 'reducers/interfaces';

import ProjectsPageComponent from 'components/projects-page/projects-page';

import { getProjectsAsync } from 'actions/projects-actions';

interface StateToProps {
    tasksFetching: boolean;
    gettingQuery: ProjectsQuery;
    numberOfProjects: number;
}

interface DispatchToProps {
    onGetProjects: (gettingQuery: ProjectsQuery) => void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { projects } = state;

    return {
        tasksFetching: projects.fetching,
        gettingQuery: projects.gettingQuery,
        numberOfProjects: projects.count,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onGetProjects: (query: ProjectsQuery): void => {
            dispatch(getProjectsAsync(query));
        },
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ProjectsPageComponent);
