// SPDX-License-Identifier: MIT

import React from 'react';
import { useSelector } from 'react-redux';

import { CombinedState } from 'reducers';
import { KeyMap } from 'utils/mousetrap-react';

const ShortcutsContext = React.createContext<KeyMap | null>(null);
const { Provider: ContextProvider } = ShortcutsContext;

function ShortcutsProvider({ children }: { children: React.ReactNode }): JSX.Element {
    const keyMap = useSelector((state: CombinedState) => state.shortcuts.keyMap);
    return (
        <ContextProvider value={keyMap}>
            {children}
        </ContextProvider>
    );
}

export default ShortcutsContext;
export const ShortcutsContextProvider = React.memo(ShortcutsProvider);
