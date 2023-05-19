export function percent(a?: number, b?: number): string | number {
    if (Number.isFinite(a) && typeof a !== 'undefined' && b) {
        return Number((a / b) * 100).toFixed(1);
    }
    return 'N/A';
}
