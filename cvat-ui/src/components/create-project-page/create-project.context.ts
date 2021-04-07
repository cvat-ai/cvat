// Copyright (C) 2020-2021 Intel Corporation
//
// SPDX-License-Identifier: MIT
import { createContext, Dispatch, SetStateAction } from 'react';

export interface IState<T> {
    value: T;
    set?: Dispatch<SetStateAction<T>>;
}

export function getDefaultState<T>(v: T): IState<T> {
    return {
        value: v,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        set: (value: SetStateAction<T>): void => {},
    };
}

export interface ICreateProjectContext {
    projectClass: IState<string>;
    trainingEnabled: IState<boolean>;
    isTrainingActive: IState<boolean>;
}

export const defaultState: ICreateProjectContext = {
    projectClass: getDefaultState<string>(''),
    trainingEnabled: getDefaultState<boolean>(false),
    isTrainingActive: getDefaultState<boolean>(false),
};

export default createContext<ICreateProjectContext>(defaultState);
