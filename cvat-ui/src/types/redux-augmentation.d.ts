// Global type augmentations for the CVAT project

import 'redux';

declare module 'redux' {
  interface AnyAction {
    payload?: any;
  }
}
