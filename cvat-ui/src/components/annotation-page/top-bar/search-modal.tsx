// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { shallowEqual } from 'utils/redux';

import { CombinedState } from 'reducers';
import { changeFrameAsync, switchShowSearchFramesModal } from 'actions/annotation-actions';
import FrameSearchModal, { FrameSearchItem } from 'components/common/frame-search-modal';

function SearchFramesModal(): JSX.Element {
    const dispatch = useDispatch();
    const {
        visible,
        meta,
        frameNumbers,
    } = useSelector((state: CombinedState) => ({
        visible: state.annotation.search.visible,
        meta: state.annotation.job.meta,
        frameNumbers: state.annotation.job.frameNumbers,
    }), shallowEqual);

    const searchData = useMemo<FrameSearchItem[]>(() => {
        if (!meta) {
            return [];
        }
        return meta.frames.map((frame, idx) => ({
            name: frame.name,
            number: frameNumbers[idx],
        }));
    }, [meta, frameNumbers]);

    const onCancel = useCallback(() => {
        dispatch(switchShowSearchFramesModal(false));
    }, []);

    const onSelect = useCallback((frameNumber: number) => {
        dispatch(switchShowSearchFramesModal(false));
        dispatch(changeFrameAsync(frameNumber));
    }, []);

    return (
        <FrameSearchModal
            visible={visible}
            searchData={searchData}
            onSelect={onSelect}
            onCancel={onCancel}
        />
    );
}

export default React.memo(SearchFramesModal);
