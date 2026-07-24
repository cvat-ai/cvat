// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
    changeAudioIntervalLabelAsync, updateAudioIntervalAsync,
} from 'actions/audio-actions';
import AudioRegionDetails from 'audio/components/annotation-page/audio-workspace/audio-region-details';
import { CombinedState } from 'reducers';
import { shallowEqual, ThunkDispatch } from 'utils/redux';
import { selectAudioIntervals } from 'audio/components/annotation-page/audio-workspace/utils/audio-interval';

function AudioRegionDetailsWrapper(): JSX.Element | null {
    const dispatch = useDispatch<ThunkDispatch>();
    const {
        intervals, activeIntervalID, labels,
    } = useSelector((state: CombinedState) => ({
        intervals: selectAudioIntervals(state),
        activeIntervalID: state.audio.player.activeIntervalID,
        labels: state.annotation.job.labels,
    }), shallowEqual);
    const interval = activeIntervalID === null ? null :
        intervals.find((item) => item.clientID === activeIntervalID);
    const handleChangeLabel = useCallback((labelID: number): void => {
        if (activeIntervalID !== null) {
            dispatch(changeAudioIntervalLabelAsync(activeIntervalID, labelID));
        }
    }, [activeIntervalID, dispatch]);
    const handleChangeAttribute = useCallback((attributeID: number, value: string): void => {
        if (activeIntervalID !== null) {
            dispatch(updateAudioIntervalAsync(activeIntervalID, {
                attributes: { [attributeID]: value },
            }));
        }
    }, [activeIntervalID, dispatch]);

    if (!interval) return null;
    return (
        <AudioRegionDetails
            interval={interval}
            intervalIndex={intervals.indexOf(interval)}
            labels={labels}
            onChangeLabel={handleChangeLabel}
            onChangeAttribute={handleChangeAttribute}
        />
    );
}

export default React.memo(AudioRegionDetailsWrapper);
