import React from 'react';

import {
    Row,
    Col,
    Layout,
} from 'antd';

import { SliderValue } from 'antd/lib/slider';

import LeftGroup from './left-group';
import RightGroup from './right-group';
import PlayerNavigation from './player-navigation';
import PlayerButtons from './player-buttons';

interface Props {
    playing: boolean;
    saving: boolean;
    savingStatuses: string[];
    frameNumber: number;
    startFrame: number;
    stopFrame: number;
    showStatistics(): void;
    onSwitchPlay(): void;
    onSaveAnnotation(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
    onSliderChange(value: SliderValue): void;
    onInputChange(value: number | undefined): void;
}

function propsAreEqual(curProps: Props, prevProps: Props): boolean {
    return curProps.playing === prevProps.playing
        && curProps.saving === prevProps.saving
        && curProps.frameNumber === prevProps.frameNumber
        && curProps.startFrame === prevProps.startFrame
        && curProps.stopFrame === prevProps.stopFrame
        && curProps.savingStatuses.length === prevProps.savingStatuses.length;
}

function AnnotationTopBarComponent(props: Props): JSX.Element {
    const {
        saving,
        savingStatuses,
        playing,
        frameNumber,
        startFrame,
        stopFrame,
        showStatistics,
        onSwitchPlay,
        onSaveAnnotation,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
        onSliderChange,
        onInputChange,
    } = props;

    return (
        <Layout.Header className='cvat-annotation-header'>
            <Row type='flex' justify='space-between'>
                <LeftGroup
                    saving={saving}
                    savingStatuses={savingStatuses}
                    onSaveAnnotation={onSaveAnnotation}
                />
                <Col className='cvat-annotation-header-player-group'>
                    <Row type='flex' align='middle'>
                        <PlayerButtons
                            playing={playing}
                            onPrevFrame={onPrevFrame}
                            onNextFrame={onNextFrame}
                            onForward={onForward}
                            onBackward={onBackward}
                            onFirstFrame={onFirstFrame}
                            onLastFrame={onLastFrame}
                            onSwitchPlay={onSwitchPlay}
                        />
                        <PlayerNavigation
                            startFrame={startFrame}
                            stopFrame={stopFrame}
                            frameNumber={frameNumber}
                            onSliderChange={onSliderChange}
                            onInputChange={onInputChange}
                        />
                    </Row>
                </Col>
                <RightGroup showStatistics={showStatistics} />
            </Row>
        </Layout.Header>
    );
}

export default React.memo(AnnotationTopBarComponent, propsAreEqual);
