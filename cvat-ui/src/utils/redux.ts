// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) 2022 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Action, ActionCreatorsMapObject, AnyAction } from 'redux';
import { ThunkAction as _ThunkAction, ThunkDispatch as _ThunkDispatch } from 'redux-thunk';
import { CombinedState } from '../reducers';

export interface ActionWithPayload<T, P> extends Action<T> {
    payload: P;
}

export function createAction<T extends string>(type: T): Action<T>;
export function createAction<T extends string, P>(type: T, payload: P): ActionWithPayload<T, P>;
export function createAction<T extends string, P>(type: T, payload?: P): Action<T> | ActionWithPayload<T, P> {
    return typeof payload === 'undefined' ? { type } : { type, payload };
}

export type ActionUnion<A extends ActionCreatorsMapObject> = ReturnType<A[keyof A]>;

export type ThunkAction<R = Promise<void>, A extends Action = AnyAction> = _ThunkAction<R, CombinedState, {}, A>;

export type ThunkDispatch<E = {}, A extends Action = AnyAction> = _ThunkDispatch<CombinedState, E, A>;
