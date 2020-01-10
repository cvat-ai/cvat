import { AnyAction } from 'redux';

import {
    SettingsState,
    GridColor,
    FrameSpeed,
} from './interfaces';

const defaultState: SettingsState = {
    workspace: {
        autoSave: false,
        autoSaveInterval: 15 * 60 * 1000,
        aamZoomMargin: 100,
        showAllInterpolationTracks: false,
    },
    player: {
        frameStep: 10,
        frameSpeed: FrameSpeed.Usual,
        resetZoom: false,
        rotateAll: false,
        grid: false,
        gridSize: 100,
        gridColor: GridColor.White,
        gridOpacity: 0,
        brightnessLevel: 50,
        contrastLevel: 50,
        saturationLevel: 50,
    },
};

export default (state = defaultState, action: AnyAction): SettingsState => {
    switch (action.type) {
        default: {
            return {
                ...state,
            };
        }
    }
};
