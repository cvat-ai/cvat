import React from 'react';

import {
    Col,
    Icon,
    Tooltip,
} from 'antd';

import {
    FirstIcon,
    BackJumpIcon,
    PreviousIcon,
    PlayIcon,
    PauseIcon,
    NextIcon,
    ForwardJumpIcon,
    LastIcon,
} from '../../../icons';

interface Props {
    playing: boolean;
    onSwitchPlay(): void;
    onPrevFrame(): void;
    onNextFrame(): void;
    onForward(): void;
    onBackward(): void;
    onFirstFrame(): void;
    onLastFrame(): void;
}

const PlayerButtons = React.memo((props: Props): JSX.Element => {
    const {
        playing,
        onSwitchPlay,
        onPrevFrame,
        onNextFrame,
        onForward,
        onBackward,
        onFirstFrame,
        onLastFrame,
    } = props;

    return (
        <Col className='cvat-player-buttons'>
            <Tooltip overlay='Go to the first frame'>
                <Icon component={FirstIcon} onClick={onFirstFrame} />
            </Tooltip>
            <Tooltip overlay='Go back with a step'>
                <Icon component={BackJumpIcon} onClick={onBackward} />
            </Tooltip>
            <Tooltip overlay='Go back'>
                <Icon component={PreviousIcon} onClick={onPrevFrame} />
            </Tooltip>

            {!playing
                ? (
                    <Tooltip overlay='Play'>
                        <Icon
                            component={PlayIcon}
                            onClick={onSwitchPlay}
                        />
                    </Tooltip>
                )
                : (
                    <Tooltip overlay='Pause'>
                        <Icon
                            component={PauseIcon}
                            onClick={onSwitchPlay}
                        />
                    </Tooltip>
                )
            }

            <Tooltip overlay='Go next'>
                <Icon component={NextIcon} onClick={onNextFrame} />
            </Tooltip>
            <Tooltip overlay='Go next with a step'>
                <Icon component={ForwardJumpIcon} onClick={onForward} />
            </Tooltip>
            <Tooltip overlay='Go to the last frame'>
                <Icon component={LastIcon} onClick={onLastFrame} />
            </Tooltip>
        </Col>
    );
});

export default PlayerButtons;
