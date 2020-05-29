/* eslint-disable-next-line import/prefer-default-export */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(Math.min(value, max), min);
}
