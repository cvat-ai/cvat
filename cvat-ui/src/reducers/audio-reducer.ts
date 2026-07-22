// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction } from 'redux';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { AudioActionTypes } from 'actions/audio-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { limitZoom } from 'audio/utils/waveform-geometry';
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
        contextMenu: {
            top: 0,
            left: 0,
            clientID: null,
        },
        audioUrl: null,
        audioLoading: false,
        audioError: null,
        waveformReady: false,
        audioLoadRequest: null,
        seekRequest: null,
        playIntervalOnceRequest: null,
        intervalSelectionRequest: null,
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
        case AudioActionTypes.PLAY_WHOLE_AUDIO: {
            return {
                ...state,
                player: {
                    ...state.player,
                    playing: true,
                    playIntervalOnceRequest: null,
                },
            };
        }
        case AudioActionTypes.REPORT_AUDIO_CURRENT_TIME: {
            return {
                ...state,
                player: {
                    ...state.player,
                    currentTime: action.payload.time,
                },
            };
        }
        case AudioActionTypes.SEEK_AUDIO: {
            return {
                ...state,
                player: {
                    ...state.player,
                    seekRequest: action.payload.request,
                },
            };
        }
        case AudioActionTypes.COMPLETE_AUDIO_SEEK: {
            if (state.player.seekRequest !== action.payload.request) return state;
            return {
                ...state,
                player: {
                    ...state.player,
                    seekRequest: null,
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
                    zoom: limitZoom(action.payload.zoom),
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
            const playIntervalOnceRequest =
                state.player.playIntervalOnceRequest?.intervalID === action.payload.clientID ?
                    state.player.playIntervalOnceRequest : null;
            return {
                ...state,
                player: {
                    ...state.player,
                    activeIntervalID: action.payload.clientID,
                    playIntervalOnceRequest,
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
        case AudioActionTypes.UPDATE_AUDIO_CONTEXT_MENU: {
            const {
                left, top, clientID,
            } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    contextMenu: {
                        left,
                        top,
                        clientID,
                    },
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
                    audioLoadRequest: action.payload.request,
                    seekRequest: null,
                    playIntervalOnceRequest: null,
                    intervalSelectionRequest: null,
                    contextMenu: defaultState.player.contextMenu,
                },
            };
        }
        case AudioActionTypes.LOAD_AUDIO_DATA_SUCCESS: {
            if (state.player.audioLoadRequest !== action.payload.request) return state;
            return {
                ...state,
                player: {
                    ...state.player,
                    audioUrl: action.payload.audioUrl,
                    audioLoadRequest: null,
                    audioLoading: false,
                    audioError: null,
                },
            };
        }
        case AudioActionTypes.LOAD_AUDIO_DATA_FAILED: {
            if (state.player.audioLoadRequest !== action.payload.request) return state;
            return {
                ...state,
                player: {
                    ...state.player,
                    audioLoading: false,
                    audioError: action.payload.error,
                    audioLoadRequest: null,
                },
            };
        }
        case AudioActionTypes.SET_WAVEFORM_READY: {
            if (state.player.audioUrl !== action.payload.sourceURL) return state;
            return {
                ...state,
                player: {
                    ...state.player,
                    waveformReady: action.payload.ready,
                },
            };
        }
        case AudioActionTypes.PLAY_AUDIO_INTERVAL_ONCE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    activeIntervalID: action.payload.request.intervalID,
                    playIntervalOnceRequest: action.payload.request,
                },
            };
        }
        case AudioActionTypes.COMPLETE_PLAY_AUDIO_INTERVAL_ONCE: {
            // request object used as an identity for the play-once operation, so we can ignore stale requests
            if (state.player.playIntervalOnceRequest !== action.payload.request) return state;
            return {
                ...state,
                player: {
                    ...state.player,
                    playIntervalOnceRequest: null,
                },
            };
        }
        case AudioActionTypes.BEGIN_AUDIO_INTERVAL_SELECTION: {
            return {
                ...state,
                player: {
                    ...state.player,
                    intervalSelectionRequest: action.payload.request,
                },
            };
        }
        case AudioActionTypes.COMPLETE_AUDIO_INTERVAL_SELECTION: {
            if (state.player.intervalSelectionRequest !== action.payload.request) return state;
            return {
                ...state,
                player: {
                    ...state.player,
                    activeIntervalID: action.payload.clientID,
                    playIntervalOnceRequest: state.player.playIntervalOnceRequest?.intervalID ===
                        action.payload.clientID ? state.player.playIntervalOnceRequest : null,
                    intervalSelectionRequest: null,
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
                    playIntervalOnceRequest: null,
                    contextMenu: defaultState.player.contextMenu,
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
            const contextMenuClientID = intervals.some(
                (interval) => interval.clientID === state.player.contextMenu.clientID,
            ) ?
                state.player.contextMenu.clientID : null;
            const playIntervalOnceRequest = intervals.some(
                (interval) => interval.clientID === state.player.playIntervalOnceRequest?.intervalID,
            ) ? state.player.playIntervalOnceRequest : null;

            return {
                ...state,
                player: {
                    ...state.player,
                    intervals,
                    activeIntervalID,
                    hoveredIntervalID,
                    contextMenu: {
                        ...state.player.contextMenu,
                        clientID: contextMenuClientID,
                    },
                    playIntervalOnceRequest,
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
