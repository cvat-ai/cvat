// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import { showStatistics } from 'actions/annotation-actions';
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
    closeStatistics(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            statistics: { visible, collecting, data },
            job: {
                saving: savingJobStatus,
                instance: { status: jobStatus },
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
        closeStatistics(): void {
            dispatch(showStatistics(false));
        },
    };
}

type Props = StateToProps & DispatchToProps;

class StatisticsModalContainer extends React.PureComponent<Props> {
    public render(): JSX.Element {
        const {
            jobInstance, visible, collecting, data, closeStatistics, jobStatus, savingJobStatus,
        } = this.props;

        return (
            <StatisticsModalComponent
                jobInstance={jobInstance}
                collecting={collecting}
                data={data}
                visible={visible}
                jobStatus={jobStatus}
                bugTracker={jobInstance.task.bugTracker}
                startFrame={jobInstance.startFrame}
                stopFrame={jobInstance.stopFrame}
                assignee={jobInstance.assignee ? jobInstance.assignee.username : 'Nobody'}
                reviewer={jobInstance.reviewer ? jobInstance.reviewer.username : 'Nobody'}
                savingJobStatus={savingJobStatus}
                closeStatistics={closeStatistics}
            />
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(StatisticsModalContainer);
