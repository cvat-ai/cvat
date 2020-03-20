// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { connect } from 'react-redux';
import { Action } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Collapse from 'antd/lib/collapse';
import TextArea from 'antd/lib/input/TextArea';
import Tooltip from 'antd/lib/tooltip';
import copy from 'copy-to-clipboard';
import ErrorStackParser from 'error-stack-parser';

import { resetAfterErrorAsync } from 'actions/boundaries-actions';
import { CombinedState } from 'reducers/interfaces';
import logger, { LogType } from 'cvat-logger';

interface StateToProps {
    job: any | null;
}

interface DispatchToProps {
    restore(): void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

function mapStateToProps(state: CombinedState): StateToProps {
    return {
        job: state.annotation.job.instance,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<CombinedState, {}, Action>): DispatchToProps {
    return {
        restore(): void {
            dispatch(resetAfterErrorAsync());
        },
    };
}


type Props = StateToProps & DispatchToProps;
class GlobalErrorBoundary extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        const { job } = this.props;
        const parsed = ErrorStackParser.parse(error);

        const logPayload = {
            filename: parsed[0].fileName,
            line: parsed[0].lineNumber,
            message: error.message,
            column: parsed[0].columnNumber,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        };

        if (job) {
            job.logger.log(LogType.sendException, logPayload);
        } else {
            logger.log(LogType.sendException, logPayload);
        }
    }

    public render(): React.ReactNode {
        const { restore, job } = this.props;
        const { hasError, error } = this.state;

        const restoreGlobalState = (): void => {
            this.setState({
                error: null,
                hasError: false,
            });

            restore();
        };

        if (hasError && error) {
            const message = `${error.name}\n${error.message}\n\n${error.stack}`;
            return (
                <div className='cvat-global-boundary'>
                    <Result
                        status='error'
                        title='Oops, something went wrong'
                        subTitle='More likely there are some issues with the tool'
                    >
                        <div>
                            <Paragraph>
                                <Paragraph strong>What has happened?</Paragraph>
                                <Paragraph>Program error has just occured</Paragraph>
                                <Collapse accordion>
                                    <Collapse.Panel header='Error message' key='errorMessage'>
                                        <Text type='danger'>
                                            <TextArea className='cvat-global-boundary-error-field' autoSize value={message} />
                                        </Text>
                                    </Collapse.Panel>
                                </Collapse>
                            </Paragraph>

                            <Paragraph>
                                <Text strong>What should I do?</Text>
                            </Paragraph>
                            <ul>
                                <li>
                                    <Tooltip title='Copied!' trigger='click'>
                                        {/* eslint-disable-next-line */}
                                        <a onClick={() => {copy(message)}}> Copy </a>
                                    </Tooltip>
                                    the error message to clipboard
                                </li>
                                <li>
                                    Notify your manager or submit the issue directly on
                                    <a href='https://github.com/opencv/cvat'> GitHub</a>
                                </li>
                                {job ? (
                                    <li>
                                        Press
                                        {/* eslint-disable-next-line */}
                                        <a onClick={restoreGlobalState}> here </a>
                                        if you wish CVAT tried to restore your annotation progress
                                    </li>
                                ) : (
                                    <li>
                                        Update this page
                                    </li>
                                )}
                            </ul>
                        </div>
                    </Result>
                </div>
            );
        }

        const { children } = this.props;
        return children;
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(GlobalErrorBoundary);
