// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// NOTE: excluded from Webpack's HMR. Restart dev server after applying changes.

const MAXIMUM_VIOLATIONS = 100;

export type CSPViolationRecord = Pick<
    SecurityPolicyViolationEvent,
    | 'blockedURI'
    | 'columnNumber'
    | 'disposition'
    | 'effectiveDirective'
    | 'lineNumber'
    | 'sourceFile'
    | 'violatedDirective'
> & {
    count: number;
    context: string;
};

let violations: readonly CSPViolationRecord[] = [];
let observing = false;
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach((listener) => listener());
}

function getViolationKey(violation: Omit<CSPViolationRecord, 'count'>): string {
    return [
        violation.effectiveDirective,
        violation.blockedURI,
        violation.sourceFile,
        violation.lineNumber,
        violation.columnNumber,
        violation.context,
    ].join('|');
}

export function recordCSPViolation(violation: Omit<CSPViolationRecord, 'count'>): void {
    const violationKey = getViolationKey(violation);
    const previousViolation = violations.find((item) => getViolationKey(item) === violationKey);

    if (previousViolation) {
        violations = violations.map((item) => (
            getViolationKey(item) === violationKey ? { ...item, count: item.count + 1 } : item
        ));
    } else {
        violations = [...violations, { ...violation, count: 1 }].slice(-MAXIMUM_VIOLATIONS);
    }

    notify();
}

function recordViolationEvent(event: SecurityPolicyViolationEvent): void {
    recordCSPViolation({
        blockedURI: event.blockedURI || '(inline)',
        columnNumber: event.columnNumber,
        disposition: event.disposition,
        effectiveDirective: event.effectiveDirective,
        lineNumber: event.lineNumber,
        context: 'SPA',
        sourceFile: event.sourceFile,
        violatedDirective: event.violatedDirective,
    });
}

export function startCSPViolationObserver(): void {
    if (observing) {
        return;
    }

    document.addEventListener('securitypolicyviolation', recordViolationEvent);
    observing = true;
}

export function getCSPViolations(): readonly CSPViolationRecord[] {
    return violations;
}

export function clearCSPViolation(violation: CSPViolationRecord): void {
    const violationKey = getViolationKey(violation);
    violations = violations.filter((item) => getViolationKey(item) !== violationKey);
    notify();
}

export function clearCSPViolations(): void {
    violations = [];
    notify();
}

export function subscribeToCSPViolations(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
