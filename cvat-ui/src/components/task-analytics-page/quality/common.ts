export function percent(a?: number, b?: number): string | number {
    if (typeof a !== 'undefined' && Number.isFinite(a) && b) {
        return `${Number((a / b) * 100).toFixed(1)}%`;
    }
    return 'N/A';
}

const THRESHOLD = 5000;
export function clampValue(a?: number): string | number {
    if (typeof a !== 'undefined' && Number.isFinite(a)) {
        if (a <= THRESHOLD) return a;
        return `> ${THRESHOLD}`;
    }
    return 'N/A';
}

export function toRepresentation(val?: number): string {
    return (!Number.isFinite(val) ? 'N/A' : `${val?.toFixed(1)}%`);
}
