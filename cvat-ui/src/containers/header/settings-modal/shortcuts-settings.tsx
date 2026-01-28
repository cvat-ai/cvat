// Copyright (C) CVAT.ai Corporation
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
}

interface DispatchToProps {
    onKeySequenceUpdate(shortcutID: string, updatedSequence: string[]): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        shortcuts: { keyMap },
    } = state;
    return {
        keyMap,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onKeySequenceUpdate: (shortcutID: string, updatedSequence: string[]): void => {
            dispatch(shortcutsActions.updateSequence(shortcutID, updatedSequence));
        },
    };
}

function ShortcutsSettingsContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return <ShortcutsSettingsComponent {...props} />;
}

export default connect(mapStateToProps, mapDispatchToProps)(ShortcutsSettingsContainer);
