import { KeyMap } from './mousetrap-react';

export function subKeyMap(componentShortcuts: KeyMap, keyMap: KeyMap): KeyMap {
    return Object.fromEntries(
        Object.keys(componentShortcuts).filter((key) => !!keyMap[key]).map((key) => [key, keyMap[key]]),
    );
}
