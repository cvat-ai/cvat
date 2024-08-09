// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { CombinedState } from 'reducers';

import ShortcutsSettingsComponent from 'components/header/settings-modal/shortcut-settings';
import { KeyMap } from 'utils/mousetrap-react';
import { shortcutsActions } from 'actions/shortcuts-actions';

interface StateToProps {
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
}

interface DispatchToProps {
    onKeySequenceUpdate(keyMapId: string, updatedSequence: string[]): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;
    return {
        keyMap,
        normalizedKeyMap,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onKeySequenceUpdate: (keyMapId: string, updatedSequence: string[]): void => {
            dispatch(shortcutsActions.updateSequence(keyMapId, updatedSequence));
        },
    };
}

function ShortcutsSettingsContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return <ShortcutsSettingsComponent {...props} />;
}

export default connect(mapStateToProps, mapDispatchToProps)(ShortcutsSettingsContainer);
