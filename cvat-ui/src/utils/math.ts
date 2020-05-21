/* eslint-disable-next-line import/prefer-default-export */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(Math.min(value, max), min);
}

export function shift<T>(array: Array<T>, k: number): Array<T> {
    if (k > 0) {
        return array.slice(k).concat(array.slice(0,k));
    } else if (k < 0) {
        return array.slice(k).concat(array);
    } else {
        return array;
    }
}