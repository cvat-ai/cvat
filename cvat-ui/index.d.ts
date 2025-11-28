// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import 'redux-thunk/extend-redux';

declare module '*.svg';

// React JSX namespace fix
import * as React from 'react';
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> { }
    interface ElementClass extends React.Component<any> { }
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Redux AnyAction extension to support payload
declare module 'redux' {
  export interface AnyAction {
    type: any;
    payload?: any;
  }
}
