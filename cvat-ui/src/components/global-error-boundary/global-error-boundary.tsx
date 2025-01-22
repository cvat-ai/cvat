// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { connect } from 'react-redux';
import Result from 'antd/lib/result';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Collapse from 'antd/lib/collapse';
import TextArea from 'antd/lib/input/TextArea';
import ErrorStackParser from 'error-stack-parser';

import { ThunkDispatch } from 'utils/redux';
import { resetAfterErrorAsync } from 'actions/boundaries-actions';
import { CombinedState } from 'reducers';
import logger, { EventScope } from 'cvat-logger';
import config from 'config';
import { saveLogsAsync } from 'actions/annotation-actions';

interface OwnProps {
    children: JSX.Element;
}

interface StateToProps {
    job: any | null;
    serverVersion: string;
    uiVersion: string;
}

interface DispatchToProps {
    restore(): void;
    saveLogs(): void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job: { instance: job },
        },
        about: { server, packageVersion },
    } = state;

    return {
        job,
        serverVersion: server.version as string,
        uiVersion: packageVersion.ui,
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        saveLogs(): void {
            dispatch(saveLogsAsync());
        },
        restore(): void {
            dispatch(resetAfterErrorAsync());
        },
    };
}

type Props = StateToProps & DispatchToProps & OwnProps;
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
        const { job, saveLogs } = this.props;
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
            job.logger.log(EventScope.exception, logPayload).then(saveLogs);
        } else {
            logger.log(EventScope.exception, logPayload).then(saveLogs);
        }
    }

    public render(): React.ReactNode {
        const {
            restore, job, serverVersion, uiVersion,
        } = this.props;

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
                                <Paragraph>Program error has just occurred</Paragraph>
                                <Collapse
                                    accordion
                                    defaultActiveKey={['errorMessage']}
                                    items={[{
                                        key: 'errorMessage',
                                        label: 'Exception details',
                                        children: (
                                            <Text type='danger'>
                                                <TextArea
                                                    className='cvat-global-boundary-error-field'
                                                    autoSize
                                                    value={message}
                                                />
                                            </Text>
                                        ),
                                    }]}
                                />
                            </Paragraph>

                            <Paragraph>
                                <Text strong>What should I do?</Text>
                            </Paragraph>
                            <ul>
                                <li>
                                    Notify an administrator or submit the issue directly on
                                    <a href={config.GITHUB_URL}> GitHub. </a>
                                    Please, provide also:
                                    <ul>
                                        <li>Full error message above</li>
                                        <li>Steps to reproduce the issue</li>
                                        <li>Your operating system and browser version</li>
                                        <li>CVAT version</li>
                                        <ul>
                                            <li>
                                                <Text strong>Server: </Text>
                                                {serverVersion}
                                            </li>
                                            <li>
                                                <Text strong>UI: </Text>
                                                {uiVersion}
                                            </li>
                                        </ul>
                                    </ul>
                                </li>
                                {job ? (
                                    <li>
                                        Press
                                        {/* eslint-disable-next-line */}
                                        <a onClick={restoreGlobalState}> here </a>
                                        if you wish CVAT tried to restore your annotation progress or
                                        {/* eslint-disable-next-line */}
                                        <a onClick={() => window.location.reload()}> update </a>
                                        the page
                                    </li>
                                ) : (
                                    <li>
                                        {/* eslint-disable-next-line */}
                                        <a onClick={() => window.location.reload()}>Update </a>
                                        the page
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

export default connect(mapStateToProps, mapDispatchToProps)(GlobalErrorBoundary);
