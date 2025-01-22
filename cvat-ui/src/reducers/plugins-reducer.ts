// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { PluginsActionTypes, PluginActions } from 'actions/plugins-actions';
import { PluginComponent, PluginsState } from '.';

const defaultState: PluginsState = {
    fetching: false,
    initialized: false,
    list: {
        ANALYTICS: false,
        MODELS: false,
    },
    current: {},
    callbacks: {
        annotationPage: {
            header: {
                menu: {
                    beforeJobFinish: [],
                },
            },
        },
    },
    overridableComponents: {
        annotationPage: {
            header: {
                // not used
                saveAnnotationButton: [],
            },
        },
        qualityControlPage: {
            overviewTab: [],
            allocationTable: [],
        },
    },
    components: {
        header: {
            userMenu: {
                items: [],
            },
        },
        loginPage: {
            loginForm: [],
        },
        modelsPage: {
            topBar: {
                items: [],
            },
            modelItem: {
                menu: {
                    items: [],
                },
                topBar: {
                    menu: {
                        items: [],
                    },
                },
            },
        },
        projectActions: {
            // not used
            items: [],
        },
        taskActions: {
            // not used
            items: [],
        },
        taskItem: {
            // not used
            ribbon: [],
        },
        projectItem: {
            // not used
            ribbon: [],
        },
        router: [],
        settings: {
            player: [],
        },
        about: {
            links: {
                items: [],
            },
        },
    },
};

function findContainerFromPath(
    path: string,
    state: PluginsState,
    prefix: 'components' | 'callbacks' | 'overridableComponents',
): unknown[] {
    const pathSegments = path.split('.');
    let updatedStateSegment: any = state[prefix];
    for (const pathSegment of pathSegments) {
        if (Array.isArray(updatedStateSegment[pathSegment])) {
            updatedStateSegment[pathSegment] = [...updatedStateSegment[pathSegment]];
        } else {
            updatedStateSegment[pathSegment] = { ...updatedStateSegment[pathSegment] };
        }
        updatedStateSegment = updatedStateSegment[pathSegment];
        if (typeof updatedStateSegment === 'undefined') {
            throw new Error('The specified plugins path is not supported by the core application');
        }
    }

    if (!Array.isArray(updatedStateSegment)) {
        throw new Error('Could not add plugin component. Target path is not array');
    }

    return updatedStateSegment;
}

export default function (state: PluginsState = defaultState, action: PluginActions): PluginsState {
    switch (action.type) {
        case PluginsActionTypes.GET_PLUGINS: {
            return {
                ...state,
                initialized: false,
                fetching: true,
            };
        }
        case PluginsActionTypes.GET_PLUGINS_SUCCESS: {
            const { list } = action.payload;

            return {
                ...state,
                initialized: true,
                fetching: false,
                list,
            };
        }
        case PluginsActionTypes.GET_PLUGINS_FAILED: {
            return {
                ...state,
                initialized: true,
                fetching: false,
            };
        }
        case PluginsActionTypes.ADD_UI_COMPONENT: {
            const { path, component, data } = action.payload;
            const updatedState = {
                ...state,
                components: { ...state.components },
            };

            const container = findContainerFromPath(path, updatedState, 'components') as PluginComponent[];
            container.push({
                component,
                data: {
                    weight: data?.weight || Number.MAX_SAFE_INTEGER,
                    shouldBeRendered: (componentProps: object = {}, componentState: object = {}) => {
                        if (data?.shouldBeRendered) {
                            return data.shouldBeRendered(Object.freeze(componentProps), Object.freeze(componentState));
                        }
                        return true;
                    },
                },
            });

            return updatedState;
        }
        case PluginsActionTypes.UPDATE_UI_COMPONENT: {
            const { path, component } = action.payload;
            const updatedState = {
                ...state,
                overridableComponents: { ...state.overridableComponents },
            };

            const container = findContainerFromPath(path, updatedState, 'overridableComponents') as CallableFunction[];
            container.push(component);

            return updatedState;
        }
        case PluginsActionTypes.REVOKE_UI_COMPONENT: {
            const { path, component } = action.payload;
            const updatedState = {
                ...state,
                overridableComponents: { ...state.overridableComponents },
            };

            const container = findContainerFromPath(path, updatedState, 'overridableComponents') as CallableFunction[];
            const index = container.findIndex((el) => el === component);
            if (index !== -1) {
                container.splice(index, 1);
            }

            return updatedState;
        }
        case PluginsActionTypes.REMOVE_UI_COMPONENT: {
            const { path, component } = action.payload;
            const updatedState = {
                ...state,
                components: { ...state.components },
            };

            const container = findContainerFromPath(path, updatedState, 'components') as PluginComponent[];
            const index = container.findIndex((el) => el.component === component);
            if (index !== -1) {
                container.splice(index, 1);
            }

            return updatedState;
        }
        case PluginsActionTypes.ADD_UI_CALLBACK: {
            const { path, callback } = action.payload;
            const updatedState = {
                ...state,
                components: { ...state.components },
            };

            const container = findContainerFromPath(path, updatedState, 'callbacks') as CallableFunction[];
            container.push(callback);

            return updatedState;
        }
        case PluginsActionTypes.REMOVE_UI_CALLBACK: {
            const { path, callback } = action.payload;
            const updatedState = {
                ...state,
                components: { ...state.components },
            };

            const container = findContainerFromPath(path, updatedState, 'callbacks') as CallableFunction[];
            const index = container.findIndex((_callback) => _callback === callback);
            if (index !== -1) {
                container.splice(index, 1);
            }

            return updatedState;
        }
        case PluginsActionTypes.ADD_PLUGIN: {
            const { name, destructor, globalStateDidUpdate } = action.payload;
            return {
                ...state,
                current: {
                    ...state.current,
                    [name]: {
                        destructor,
                        globalStateDidUpdate,
                    },
                },
            };
        }
        default:
            return state;
    }
}
