import './styles.scss';
import React from 'react';

import {
    Layout,
    Spin,
    Result,
} from 'antd';

import AnnotationTopBarComponent from './top-bar/top-bar';
import StandardWorkspaceComponent from './standard-workspace/standard-workspace';

interface Props {
    jobInstance: any | null | undefined;
    fetching: boolean;
    getJob(): void;
}

interface State {
    frame: number | null;
    playing: boolean;
}

export default class AnnotationPageComponent extends React.PureComponent<Props, State> {
    private playTimeout: number | null;
    public constructor(props: Props) {
        super(props);
        this.state = {
            frame: null,
            playing: false,
        };
        this.playTimeout = null;
    }

    private setupCanvasCallback = (): void => {
        const {
            jobInstance,
        } = this.props;

        const {
            frame,
            playing,
        } = this.state;

        if (jobInstance && frame !== null && playing && frame < jobInstance.stopFrame) {
            this.playTimeout = window.setTimeout(this.changeFrameTimeoutCallback, 10);
        } else {
            this.setState({
                playing: false,
            });
        }
    };

    private changeFrameTimeoutCallback = (): void => {
        const {
            jobInstance,
        } = this.props;

        const {
            frame,
        } = this.state;

        if (jobInstance && frame !== null && jobInstance.stopFrame > frame) {
            this.setState((prevState: State) => ({
                frame: prevState.frame as number + 1,
            }));
        }
    };

    public render(): JSX.Element {
        const {
            jobInstance,
            fetching,
            getJob,
        } = this.props;

        const {
            frame,
            playing,
        } = this.state;

        if (jobInstance === null) {
            if (!fetching) {
                getJob();
            }

            return <Spin size='large' className='cvat-spinner' />;
        }

        if (typeof (jobInstance) === 'undefined') {
            return (
                <Result
                    className='cvat-not-found'
                    status='404'
                    title='Sorry, but this job was not found'
                    subTitle='Please, be sure information you tried to get exist and you have access'
                />
            );
        }

        return (
            <Layout className='cvat-annotation-page'>
                <AnnotationTopBarComponent
                    jobInstance={jobInstance}
                    frame={frame}
                    playing={playing}
                    onChangeFrame={(_frame: number): void => {
                        this.setState({
                            frame: Math.max(
                                Math.min(_frame, jobInstance.stopFrame),
                                jobInstance.startFrame,
                            ),
                        });
                    }}
                    onPlay={(_playing: boolean): void => {
                        const notTheLastFrame = frame !== null && frame < jobInstance.stopFrame;
                        if (_playing && notTheLastFrame) {
                            this.setState((prevState: State) => ({
                                playing: true,
                                frame: prevState.frame as number + 1,
                            }));
                        } else {
                            if (this.playTimeout) {
                                clearTimeout(this.playTimeout);
                            }
                            this.setState({
                                playing: false,
                            });
                        }
                        this.setState({
                            playing: _playing && frame !== null && frame < jobInstance.stopFrame,
                        });
                    }}
                />
                <StandardWorkspaceComponent
                    jobInstance={jobInstance}
                    frame={frame}
                    onSetupCanvas={this.setupCanvasCallback}
                />
            </Layout>
        );
    }
}
