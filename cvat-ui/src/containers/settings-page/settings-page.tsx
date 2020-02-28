// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';

import SettingsPageComponent from 'components/settings-page/settings-page';


import {
    CombinedState,
} from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: {
                instance: jobInstance,
            },
        },
    } = state;
    return {
        jobInstance,
    };
}

type Props = StateToProps & RouteComponentProps;
class SettingsPageContainer extends React.PureComponent<Props> {
    private unblock: any;

    public componentDidMount(): void {
        const {
            history,
            jobInstance,
        } = this.props;

        this.unblock = history.block((location: any) => {
            if (jobInstance && jobInstance.annotations.hasUnsavedChanges()
                && location.pathname !== `/tasks/${jobInstance.task.id}/jobs/${jobInstance.id}`) {
                return 'You have unsaved changes, please confirm leaving this page.';
            }
            return undefined;
        });
        this.beforeUnloadCallback = this.beforeUnloadCallback.bind(this);
        window.addEventListener('beforeunload', this.beforeUnloadCallback);
    }

    public componentWillUnmount(): void {
        window.removeEventListener('beforeunload', this.beforeUnloadCallback);
        this.unblock();
    }

    private beforeUnloadCallback(event: BeforeUnloadEvent): any {
        const { jobInstance } = this.props;
        if (jobInstance.annotations.hasUnsavedChanges()) {
            const confirmationMessage = 'You have unsaved changes, please confirm leaving this page.';
            // eslint-disable-next-line no-param-reassign
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }
        return undefined;
    }

    public render(): JSX.Element {
        return (
            <SettingsPageComponent {...this.props} />
        );
    }
}

export default withRouter(
    connect(
        mapStateToProps,
    )(SettingsPageContainer),
);
