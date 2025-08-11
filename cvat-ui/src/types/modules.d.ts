// Temporary type declarations to resolve module errors while dependencies are installing

declare module 'lodash' {
  const _: any;
  export = _;
}

declare module 'redux' {
  export interface AnyAction {
    type: any;
    payload?: any;
  }
  export interface Action<T = any> {
    type: T;
  }
}

declare module 'react' {
  const React: any;
  export = React;
}

declare module 'react-redux' {
  export function connect(mapStateToProps?: any, mapDispatchToProps?: any): any;
}

declare module 'antd/lib/*' {
  const component: any;
  export default component;
}

declare module '@ant-design/icons' {
  export const PlusCircleOutlined: any;
  export const UpOutlined: any;
}

declare module 'lodash/debounce' {
  const debounce: any;
  export = debounce;
}

declare module 'cvat-canvas3d/src/typescript/canvas3d' {
  export class Canvas3d {}
}

declare module 'cvat-canvas/src/typescript/canvas' {
  export class Canvas {
    html(): HTMLDivElement;
    configure(configuration: any): void;
    activate(clientID: number | null, attributeID?: number | null): void;
    highlight(clientIDs: number[], severity: any): void;
    grid(x: number, y: number): void;
    bitmap(enabled: boolean): void;
    rotate(angle: number): void;
    fit(): void;
    select(state: any): void;
    focus(clientID: number, margin: number): void;
    [key: string]: any;
  }
}

declare module 'cvat-core/src/api' {
  export const core: any;
}

// Canvas tips component
declare const CanvasTipsComponent: React.ComponentType<any>;

// Override Redux AnyAction to include payload
declare global {
  namespace Redux {
    interface AnyAction {
      payload?: any;
    }
  }
}
