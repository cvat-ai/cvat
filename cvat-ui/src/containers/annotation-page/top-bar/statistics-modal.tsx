// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import {
    showStatistics,
    changeJobStatusAsync,
} from 'actions/annotation-actions';
import StatisticsModalComponent from 'components/annotation-page/top-bar/statistics-modal';

interface StateToProps {
    visible: boolean;
    collecting: boolean;
    data: any;
    jobInstance: any;
    jobStatus: string;
    savingJobStatus: boolean;
}

interface DispatchToProps {
    changeJobStatus(jobInstance: any, status: string): void;
    closeStatistics(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            statistics: {
                visible,
                collecting,
                data,
            },
            job: {
                saving: savingJobStatus,
                instance: {
                    status: jobStatus,
                },
                instance: jobInstance,
            },
        },
    } = state;

    return {
        visible,
        collecting,
        data,
        jobInstance,
        jobStatus,
        savingJobStatus,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeJobStatus(jobInstance: any, status: string): void {
            dispatch(changeJobStatusAsync(jobInstance, status));
        },
        closeStatistics(): void {
            dispatch(showStatistics(false));
        },
    };
}

type Props = StateToProps & DispatchToProps;

class StatisticsModalContainer extends React.PureComponent<Props> {
    private changeJobStatus = (status: string): void => {
        const {
            jobInstance,
            changeJobStatus,
        } = this.props;

        changeJobStatus(jobInstance, status);
    };

    public render(): JSX.Element {
        const {
            jobInstance,
            visible,
            collecting,
            data,
            closeStatistics,
            jobStatus,
            savingJobStatus,
        } = this.props;

        return (
            <StatisticsModalComponent
                collecting={collecting}
                data={data}
                visible={visible}
                jobStatus={jobStatus}
                bugTracker={jobInstance.task.bugTracker}
                zOrder={jobInstance.task.zOrder}
                startFrame={jobInstance.startFrame}
                stopFrame={jobInstance.stopFrame}
                assignee={jobInstance.assignee ? jobInstance.assignee.username : 'Nobody'}
                savingJobStatus={savingJobStatus}
                closeStatistics={closeStatistics}
                changeJobStatus={this.changeJobStatus}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(StatisticsModalContainer);
