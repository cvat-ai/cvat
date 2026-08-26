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
        playbackRange: null,
        playbackRangeSource: null,
        fitIntervalRequest: null,
        intervals: [],
        activeIntervalID: null,
        hoveredIntervalID: null,
        interactingIntervalID: null,
        contextMenu: {
            top: 0,
            left: 0,
            clientID: null,
        },
        audioDataToken: null,
        audioLoading: false,
        audioError: null,
        waveformReady: false,
        audioLoadRequest: null,
        seekRequest: null,
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
        case AudioActionTypes.PLAY_FULL_AUDIO: {
            return {
                ...state,
                player: {
                    ...state.player,
                    playing: true,
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
        case AudioActionTypes.SET_AUDIO_PLAYBACK_RANGE: {
            return {
                ...state,
                player: {
                    ...state.player,
                    playbackRange: action.payload.range,
                },
            };
        }
        case AudioActionTypes.UPDATE_AUDIO_PLAYBACK_RANGE: {
            if (state.player.playbackRange?.id !== action.payload.range.id) return state;

            return {
                ...state,
                player: {
                    ...state.player,
                    playbackRange: action.payload.range,
                },
            };
        }
        case AudioActionTypes.CLEAR_AUDIO_PLAYBACK_RANGE: {
            if (action.payload.id && state.player.playbackRange?.id !== action.payload.id) return state;

            return {
                ...state,
                player: {
                    ...state.player,
                    playbackRange: null,
                },
            };
        }
        case AudioActionTypes.SET_AUDIO_INTERVAL_PLAYBACK_SOURCE: {
            if (state.player.playbackRange?.id !== action.payload.rangeID) return state;

            return {
                ...state,
                player: {
                    ...state.player,
                    playbackRangeSource: {
                        rangeID: action.payload.rangeID,
                        intervalID: action.payload.intervalID,
                    },
                },
            };
        }
        case AudioActionTypes.CLEAR_AUDIO_INTERVAL_PLAYBACK_SOURCE: {
            if (state.player.playbackRangeSource?.rangeID !== action.payload.rangeID) return state;

            return {
                ...state,
                player: {
                    ...state.player,
                    playbackRangeSource: null,
                },
            };
        }
        case AudioActionTypes.FIT_AUDIO_INTERVAL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    fitIntervalRequest: action.payload.request,
                },
            };
        }
        case AudioActionTypes.COMPLETE_FIT_AUDIO_INTERVAL: {
            if (state.player.fitIntervalRequest !== action.payload.request) return state;

            return {
                ...state,
                player: {
                    ...state.player,
                    fitIntervalRequest: null,
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
        case AudioActionTypes.SET_AUDIO_INTERACTING_INTERVAL: {
            return {
                ...state,
                player: {
                    ...state.player,
                    interactingIntervalID: action.payload.clientID,
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
                    audioDataToken: null,
                    audioLoadRequest: action.payload.request,
                    seekRequest: null,
                    playbackRange: null,
                    playbackRangeSource: null,
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
                    audioDataToken: action.payload.audioDataToken,
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
            if (state.player.audioDataToken !== action.payload.sourceToken) return state;
            return {
                ...state,
                player: {
                    ...state.player,
                    waveformReady: action.payload.ready,
                    ...(action.payload.ready ? {} : {
                        audioDataToken: null,
                        playing: false,
                        currentTime: 0,
                        duration: 0,
                    }),
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
                    interactingIntervalID: null,
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
            const interactingIntervalID = intervals.some(
                (interval) => interval.clientID === state.player.interactingIntervalID,
            ) ?
                state.player.interactingIntervalID : null;
            const contextMenuClientID = intervals.some(
                (interval) => interval.clientID === state.player.contextMenu.clientID,
            ) ?
                state.player.contextMenu.clientID : null;
            return {
                ...state,
                player: {
                    ...state.player,
                    intervals,
                    activeIntervalID,
                    hoveredIntervalID,
                    interactingIntervalID,
                    contextMenu: {
                        ...state.player.contextMenu,
                        clientID: contextMenuClientID,
                    },
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
