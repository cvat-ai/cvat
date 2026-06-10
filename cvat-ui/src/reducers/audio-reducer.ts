// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { AudioActionTypes } from 'actions/audio-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { ActiveControl, AudioState } from '.';

const defaultState: AudioState = {
    player: {
        playing: false,
        currentTime: 0,
        duration: 0,
        playbackRate: 1,
        zoom: 1,
        volume: 1,
        loop: false,
        intervals: [],
        activeIntervalID: null,
        hoveredIntervalID: null,
        audioUrl: null,
        audioLoading: false,
        audioError: null,
        waveformReady: false,
        activeLabelId: null,
    },
};

export default function audioReducer(state: AudioState = defaultState, action: AnyAction): AudioState {
    switch (action.type) {
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const { job } = action.payload;
            return {
                ...defaultState,
                player: {
                    ...defaultState.player,
                    activeLabelId: job.labels.length ? job.labels[0].id : null,
                },
            };
        }
        case AudioActionTypes.SWITCH_AUDIO_PLAY: {
            return {
                ...state,
                player: {
                    ...state.player,
                    playing: action.payload.playing,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_CURRENT_TIME: {
            return {
                ...state,
                player: {
                    ...state.player,
                    currentTime: action.payload.time,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_DURATION: {
            return {
                ...state,
                player: {
                    ...state.player,
                    duration: action.payload.duration,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_PLAYBACK_RATE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    playbackRate: action.payload.rate,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_ZOOM: {
            return {
                ...state,
                player: {
                    ...state.player,
                    zoom: action.payload.zoom,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_VOLUME: {
            return {
                ...state,
                player: {
                    ...state.player,
                    volume: action.payload.volume,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_LOOP: {
            return {
                ...state,
                player: {
                    ...state.player,
                    loop: action.payload.loop,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_ACTIVE_INTERVAL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    activeIntervalID: action.payload.clientID,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_HOVERED_INTERVAL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    hoveredIntervalID: action.payload.clientID,
                },
            };
        }
        case AudioActionTypes.LOAD_AUDIO_DATA: {
            return {
                ...state,
                player: {
                    ...state.player,
                    audioLoading: true,
                    audioError: null,
                    waveformReady: false,
                    audioUrl: null,
                },
            };
        }
        case AudioActionTypes.LOAD_AUDIO_DATA_SUCCESS: {
            return {
                ...state,
                player: {
                    ...state.player,
                    audioUrl: action.payload.audioUrl,
                    audioLoading: false,
                    audioError: null,
                },
            };
        }
        case AudioActionTypes.LOAD_AUDIO_DATA_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    audioLoading: false,
                    audioError: action.payload.error,
                },
            };
        }
        case AudioActionTypes.SET_WAVEFORM_READY: {
            return {
                ...state,
                player: {
                    ...state.player,
                    waveformReady: action.payload.ready,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_ACTIVE_LABEL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    activeLabelId: action.payload.labelId,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ACTIVE_CONTROL: {
            const { activeControl } = action.payload;
            if (
                activeControl !== ActiveControl.AUDIO_REGION_CREATE &&
                activeControl !== ActiveControl.AUDIO_REGION_RECORD
            ) {
                return state;
            }

            return {
                ...state,
                player: {
                    ...state.player,
                    activeIntervalID: null,
                    hoveredIntervalID: null,
                },
            };
        }
        case AnnotationActionTypes.FETCH_ANNOTATIONS_SUCCESS: {
            const intervals = action.payload.intervals ?? [];
            const activeIntervalID = intervals.some((interval) => interval.clientID === state.player.activeIntervalID) ?
                state.player.activeIntervalID : null;
            const hoveredIntervalID = intervals.some(
                (interval) => interval.clientID === state.player.hoveredIntervalID,
            ) ?
                state.player.hoveredIntervalID : null;

            return {
                ...state,
                player: {
                    ...state.player,
                    intervals,
                    activeIntervalID,
                    hoveredIntervalID,
                },
            };
        }
        case AudioActionTypes.AUDIO_UNDO:
        case AudioActionTypes.AUDIO_REDO: {
            return state;
        }
        default:
            return state;
    }
}
