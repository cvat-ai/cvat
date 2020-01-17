import React from 'react';

import {
    Row,
    Col,
    Icon,
    Slider,
    Layout,
    Input,
    Tooltip,
    Select,
    Modal,
    Timeline,
} from 'antd';

import { SliderValue } from 'antd/lib/slider';
import Text from 'antd/lib/typography/Text';

import {
    MainMenuIcon,
    SaveIcon,
    UndoIcon,
    RedoIcon,
    PlaycontrolFirstIcon,
    PlaycontrolBackJumpIcon,
    PlaycontrolPreviousIcon,
    PlaycontrolPlayIcon,
    PlaycontrolPauseIcon,
    PlaycontrolNextIcon,
    PlaycontrolForwardJumpIcon,
    PlaycontrolLastIcon,
    InfoIcon,
    FullscreenIcon,
} from '../../../icons';

interface Props {
    jobInstance: any;
    frame: number;
    frameStep: number;
    playing: boolean;
    saving: boolean;
    savingStatuses: string[];
    canvasIsReady: boolean;
    onChangeFrame(frame: number, playing: boolean): void;
    onSwitchPlay(playing: boolean): void;
    onSaveAnnotation(sessionInstance: any): void;
}

function SavingOverlay(saving: boolean, statuses: string[]): JSX.Element {
    return (
        <Modal
            title='Saving changes on the server'
            visible={saving}
            footer={[]}
            closable={false}
        >
            <Timeline pending={statuses[statuses.length - 1] || 'Pending..'}>
                {
                    statuses.slice(0, -1)
                        .map((
                            status: string,
                            id: number,
                        // eslint-disable-next-line react/no-array-index-key
                        ) => <Timeline.Item key={id}>{status}</Timeline.Item>)
                }
            </Timeline>
        </Modal>
    );
}

export default function AnnotationTopBarComponent(props: Props): JSX.Element {
    const {
        jobInstance,
        frame,
        frameStep,
        playing,
        saving,
        savingStatuses,
        canvasIsReady,
        onChangeFrame,
        onSwitchPlay,
        onSaveAnnotation,
    } = props;

    if (playing && canvasIsReady) {
        if (frame < jobInstance.stopFrame) {
            setTimeout(() => {
                onChangeFrame(frame + 1, true);
            }, 30);
        } else {
            onSwitchPlay(false);
        }
    }

    const savingOverlay = SavingOverlay(saving, savingStatuses);

    return (
        <Layout.Header className='cvat-annotation-page-header'>
            <Row type='flex' justify='space-between'>
                <Col className='cvat-annotation-header-left-group'>
                    <div className='cvat-annotation-header-button'>
                        <Icon component={MainMenuIcon} />
                        <span>Menu</span>
                    </div>
                    <div className={saving ? 'cvat-annotation-disabled-header-button' : 'cvat-annotation-header-button'}>
                        <Icon
                            component={SaveIcon}
                            onClick={async (): Promise<void> => {
                                onSaveAnnotation(jobInstance);
                            }}
                        />
                        <span>
                            { saving ? 'Saving...' : 'Save' }
                        </span>
                        { savingOverlay }
                    </div>
                    <div className='cvat-annotation-header-button'>
                        <Icon component={UndoIcon} />
                        <span>Undo</span>
                    </div>
                    <div className='cvat-annotation-header-button'>
                        <Icon component={RedoIcon} />
                        <span>Redo</span>
                    </div>
                </Col>
                <Col className='cvat-annotation-header-player-group'>
                    <Row type='flex' align='middle'>
                        <Col className='cvat-annotation-header-player-buttons'>
                            <Tooltip overlay='Go to the first frame'>
                                <Icon
                                    component={PlaycontrolFirstIcon}
                                    onClick={(): void => {
                                        if (jobInstance.startFrame !== frame) {
                                            onSwitchPlay(false);
                                            onChangeFrame(jobInstance.startFrame, false);
                                        }
                                    }}
                                />
                            </Tooltip>
                            <Tooltip overlay='Go back with a step'>
                                <Icon
                                    component={PlaycontrolBackJumpIcon}
                                    onClick={(): void => {
                                        const newFrame = Math
                                            .max(jobInstance.startFrame, frame - frameStep);
                                        if (newFrame !== frame) {
                                            onSwitchPlay(false);
                                            onChangeFrame(newFrame, false);
                                        }
                                    }}
                                />
                            </Tooltip>
                            <Tooltip overlay='Go back'>
                                <Icon
                                    component={PlaycontrolPreviousIcon}
                                    onClick={(): void => {
                                        const newFrame = Math
                                            .max(jobInstance.startFrame, frame - 1);
                                        if (newFrame !== frame) {
                                            onSwitchPlay(false);
                                            onChangeFrame(newFrame, false);
                                        }
                                    }}
                                />
                            </Tooltip>

                            {!playing
                                ? (
                                    <Tooltip overlay='Play'>
                                        <Icon
                                            component={PlaycontrolPlayIcon}
                                            onClick={(): void => {
                                                if (frame < jobInstance.stopFrame) {
                                                    onSwitchPlay(true);
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                )
                                : (
                                    <Tooltip overlay='Pause'>
                                        <Icon
                                            component={PlaycontrolPauseIcon}
                                            onClick={(): void => {
                                                onSwitchPlay(false);
                                            }}
                                        />
                                    </Tooltip>
                                )
                            }

                            <Tooltip overlay='Go next'>
                                <Icon
                                    component={PlaycontrolNextIcon}
                                    onClick={(): void => {
                                        const newFrame = Math
                                            .min(jobInstance.stopFrame, frame + 1);
                                        if (newFrame !== frame) {
                                            onSwitchPlay(false);
                                            onChangeFrame(newFrame, false);
                                        }
                                    }}
                                />
                            </Tooltip>
                            <Tooltip overlay='Go next with a step'>
                                <Icon
                                    component={PlaycontrolForwardJumpIcon}
                                    onClick={(): void => {
                                        const newFrame = Math
                                            .min(jobInstance.stopFrame, frame + frameStep);
                                        if (newFrame !== frame) {
                                            onSwitchPlay(false);
                                            onChangeFrame(newFrame, false);
                                        }
                                    }}
                                />
                            </Tooltip>
                            <Tooltip overlay='Go to the last frame'>
                                <Icon
                                    component={PlaycontrolLastIcon}
                                    onClick={(): void => {
                                        if (jobInstance.stopFrame !== frame) {
                                            onSwitchPlay(false);
                                            onChangeFrame(jobInstance.stopFrame, false);
                                        }
                                    }}
                                />
                            </Tooltip>
                        </Col>
                        <Col className='cvat-annotation-header-player-controls'>
                            <Row type='flex'>
                                <Col>
                                    <Slider
                                        className='cvat-annotation-header-player-slider'
                                        min={jobInstance.startFrame}
                                        max={jobInstance.stopFrame}
                                        value={frame || 0}
                                        onChange={(value: SliderValue): void => {
                                            onSwitchPlay(false);
                                            onChangeFrame(value as number, false);
                                        }}
                                    />
                                </Col>
                            </Row>
                            <Row type='flex' justify='space-around'>
                                <Col className='cvat-annotation-header-filename-wrapper'>
                                    <Tooltip overlay='filename.png'>
                                        <Text type='secondary'>filename.png</Text>
                                    </Tooltip>
                                </Col>
                            </Row>
                        </Col>
                        <Col>
                            <Input
                                className='cvat-annotation-header-frame-selector'
                                type='number'
                                value={frame || 0}
                                // https://stackoverflow.com/questions/38256332/in-react-whats-the-difference-between-onchange-and-oninput
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                    onSwitchPlay(false);
                                    onChangeFrame(+e.target.value, false);
                                }}
                            />
                        </Col>
                    </Row>
                </Col>
                <Col className='cvat-annotation-header-right-group'>
                    <div className='cvat-annotation-header-button'>
                        <Icon component={FullscreenIcon} />
                        <span>Fullscreen</span>
                    </div>
                    <div className='cvat-annotation-header-button'>
                        <Icon component={InfoIcon} />
                        <span>Info</span>
                    </div>
                    <div>
                        <Select className='cvat-annotation-header-workspace-selector' defaultValue='standard'>
                            <Select.Option key='standard' value='standard'>Standard</Select.Option>
                            <Select.Option key='aam' value='aam'>Attribute annotation</Select.Option>
                        </Select>
                    </div>
                </Col>
            </Row>
        </Layout.Header>
    );
}
