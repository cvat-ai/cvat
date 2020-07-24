/* eslint-disable-next-line import/prefer-default-export */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(Math.min(value, max), min);
}

export function shift<T>(array: Array<T>, k: number): Array<T> {
    if (k % array.length !== 0) {
        return array.slice(k % array.length).concat(array.slice(0, k % array.length));
    }
    return array;
}

export function funhash(s: string): number {
    let h = 0xdeadbeef;
    for (let i = 0; i < s.length; i++) {
        // eslint-disable-next-line no-bitwise
        h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    }
    // eslint-disable-next-line no-bitwise
    return (h ^ h >>> 16) >>> 0;
}
