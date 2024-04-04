// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

export function anySearch<Type extends object>(obj: Type): boolean {
    return Object.keys(obj).some((value: string) => value !== 'page' && (obj as any)[value] !== null);
}
