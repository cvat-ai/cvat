export function subKeyMap(componentShortcuts: any, keyMap: any): any {
    return Object.fromEntries(
        Object.keys(componentShortcuts).filter((key) => !!keyMap[key]).map((key) => [key, keyMap[key]]),
    );
}
