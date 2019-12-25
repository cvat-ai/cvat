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
    playingTimeout: number | null;
}

export default class AnnotationPageComponent extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            frame: null,
            playingTimeout: null,
        };
    }

    private changeFrameTimeoutCallback = (): void => {
        const {
            jobInstance,
        } = this.props;

        const {
            frame,
        } = this.state;

        if (jobInstance && frame !== null && jobInstance.stopFrame > frame) {
            // change frame here

            this.setState((prevState: State) => ({
                frame: prevState.frame as number + 1,
                playingTimeout: window.setTimeout(this.changeFrameTimeoutCallback, 30),
            }));
        } else {
            this.setState({
                playingTimeout: null,
            });
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
            playingTimeout,
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
                    playingTimeout={playingTimeout}
                    onChangeFrame={(_frame: number): void => {
                        this.setState({
                            frame: Math.max(
                                Math.min(_frame, jobInstance.stopFrame),
                                jobInstance.startFrame,
                            ),
                        });
                    }}
                    onPlay={(playing: boolean): void => {
                        if (playing && playingTimeout === null) {
                            const timeout = window.setTimeout(this.changeFrameTimeoutCallback, 30);
                            this.setState({
                                playingTimeout: timeout,
                            });
                        } else if (!playing && playingTimeout !== null) {
                            clearTimeout(playingTimeout);

                            this.setState({
                                playingTimeout: null,
                            });
                        }
                    }}
                />
                <StandardWorkspaceComponent jobInstance={jobInstance} frame={frame} />
            </Layout>
        );
    }
}
