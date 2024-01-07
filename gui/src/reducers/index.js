// Copyright 2020-2023 The MathWorks, Inc.

import { combineReducers } from 'redux';

// ACTIONS
import {
    SET_TRIGGER_POSITION,
    SET_TUTORIAL_HIDDEN,
    SET_OVERLAY_VISIBILITY,
    REQUEST_SERVER_STATUS,
    RECEIVE_SERVER_STATUS,
    REQUEST_SET_LICENSING,
    REQUEST_TERMINATE_INTEGRATION,
    REQUEST_STOP_MATLAB,
    REQUEST_START_MATLAB,
    REQUEST_ENV_CONFIG,
    RECEIVE_SET_LICENSING,
    RECEIVE_TERMINATE_INTEGRATION,
    RECEIVE_STOP_MATLAB,
    RECEIVE_START_MATLAB,
    RECEIVE_ERROR,
    RECEIVE_ENV_CONFIG,
    SET_AUTH_STATUS,
    SET_AUTH_TOKEN,
} from '../actions';

// Stores info on whether token authentication enabled on the backend. 
// This is enforced by the backend.
export function authEnabled(state = false, action) {
    switch (action.type) {
        case RECEIVE_ENV_CONFIG:
            return action.config.authentication.enabled;
        default:
            return state;
    }
}

// Stores information on whether to use MOS HTML while rendering MATLAB.
export function useMOS(state = false, action) {
    switch (action.type) {
        case RECEIVE_ENV_CONFIG:
            return action.config.useMOS;
        default:
            return state;
    }
}

// Stores information on whether to provide MRE parameter to HTML while rendering MATLAB.
export function useMRE(state = false, action) {
    switch (action.type) {
        case RECEIVE_ENV_CONFIG:
            return action.config.useMRE;
        default:
            return state;
    }
}

// Stores status of token authentication.
export function authStatus(state = false, action) {
    switch (action.type) {
        case RECEIVE_ENV_CONFIG:
            return action.config.authentication.status;
        case SET_AUTH_STATUS:
            return action.authInfo.status;
        default:
            return state;
    }
}

// Stores auth token
export function authToken(state = null, action) {
    switch (action.type) {
        case SET_AUTH_TOKEN:
            return action.authentication.token;
        default:
            return state;
    }
}

// Stores timeout duration for idle timer.
export function idleTimeoutDuration(state = null, action) {
    switch (action.type) {
        case RECEIVE_ENV_CONFIG:
            return action.config.idleTimeoutDuration;
        default:
            return state;
    }
}

export function triggerPosition(state = { x: window.innerWidth / 2 + 27, y: 0 }, action) {
    switch (action.type) {
        case SET_TRIGGER_POSITION:
            return { x: action.x, y: action.y };
        default:
            return state;
    }
}

export function tutorialHidden(state = false, action) {
    switch (action.type) {
        case SET_TUTORIAL_HIDDEN:
            return action.hidden;
        default:
            return state;
    }
}

export function overlayVisibility(state = false, action) {
    switch (action.type) {
        case SET_OVERLAY_VISIBILITY:
            return action.visibility;
        case RECEIVE_SERVER_STATUS:
            if (
                action.previousMatlabPending === true
                && action.status.matlab.status === "up"
            ) return false;
        // fall through
        default:
            return state;
    }
}

export function licensingInfo(state = {}, action) {
    switch (action.type) {
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
            return {
                ...action.status.licensing
            };
        default:
            return state;
    }
}

export function matlabStatus(state = 'down', action) {
    switch (action.type) {
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
            return action.status.matlab.status;
        case REQUEST_STOP_MATLAB:
        case REQUEST_START_MATLAB:
            return action.status;
        default:
            return state;
    }
}

export function matlabVersionOnPath(state = null, action) {
    switch (action.type) {       
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
            return action.status.matlab.version
        case RECEIVE_ENV_CONFIG:
            return action.config.matlab.version
        default:
            return state;
    }
}

export function supportedMatlabVersions(state = null, action) {
    switch (action.type) {       
        case RECEIVE_ENV_CONFIG:
            return action.config.matlab.supported_versions
        default:
            return state;
    }
}
export function matlabBusyStatus(state = 'na', action) {
    switch (action.type) {
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
            return action.status.matlab.busyStatus;
        case REQUEST_STOP_MATLAB:
        case REQUEST_START_MATLAB:
            return action.status;
        default:
            return state;
    }
} 

export function wsEnv(state = null, action) {
    switch (action.type) {
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
            return action.status.wsEnv;
        default:
            return state;
    }
}

export function isFetching(state = false, action) {
    switch (action.type) {
        case REQUEST_SERVER_STATUS:
        case REQUEST_SET_LICENSING:
        case REQUEST_TERMINATE_INTEGRATION:
        case REQUEST_STOP_MATLAB:
        case REQUEST_START_MATLAB:
        case REQUEST_ENV_CONFIG:
            return true;
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
        case RECEIVE_ERROR:
        case RECEIVE_ENV_CONFIG:
            return false;
        default:
            return state;
    }
}

export function hasFetched(state = false, action) {
    switch (action.type) {
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
            return true;
        default:
            return state;
    }
}

export function isSubmitting(state = false, action) {
    switch (action.type) {
        case REQUEST_SET_LICENSING:
        case REQUEST_TERMINATE_INTEGRATION:
        case REQUEST_STOP_MATLAB:
        case REQUEST_START_MATLAB:
            return true;
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
        case RECEIVE_ERROR:
            return false;
        default:
            return state;
    }
}

export function fetchFailCount(state = 0, action) {
    switch (action.type) {
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
            return 0;
        case RECEIVE_ERROR:
            return state + 1;
        default:
            return state;

    }
}

export function loadUrl(state = null, action) {
    switch (action.type) {
        case RECEIVE_TERMINATE_INTEGRATION:
            return action.loadUrl;
        default:
            return state;
    }
}

export function error(state = null, action) {
    switch (action.type) {
        case SET_AUTH_STATUS:
            if (action?.authInfo?.error !== null) {
                const { message, type } = action.authInfo.error
                return {
                    message: message,
                    type: type,
                    logs: null
                }
            }
            else return null;
        case RECEIVE_ERROR:
            return {
                message: action.error,
                statusCode: action?.statusCode,
                logs: null
            };
        case RECEIVE_SERVER_STATUS:
        case RECEIVE_SET_LICENSING:
        case RECEIVE_TERMINATE_INTEGRATION:
        case RECEIVE_STOP_MATLAB:
        case RECEIVE_START_MATLAB:
            return action.status.error ? {
                message: action.status.error.message,
                logs: action.status.error.logs,
                type: action.status.error.type
            } : null;
        default:
            return state;
    }
}

export function envConfig(state = null, action) {
    switch (action.type) {
        case RECEIVE_ENV_CONFIG:
            // Token authentication info is also sent as a response to /get_env_config endpoint.
            // As its already stored in 'authStatus', 'authEnabled' and 'authToken', ignoring it in envConfig.
            const { authStatus, authEnabled, idleTimeoutDuration, ...envConfig } = action.config
            return envConfig
        default:
            return state;
    }
}

export const authentication = combineReducers({
    enabled : authEnabled,
    status : authStatus,
    token : authToken,
});

export const matlab = combineReducers({
    status : matlabStatus,
    versionOnPath : matlabVersionOnPath, 
    supportedVersions: supportedMatlabVersions,
});

export const serverStatus = combineReducers({
    licensingInfo,
    matlabStatus,
    matlabBusyStatus,
    wsEnv,
    isFetching,
    hasFetched,
    isSubmitting,
    fetchFailCount
});


export default combineReducers({
    triggerPosition,
    tutorialHidden,
    overlayVisibility,
    serverStatus,
    loadUrl,
    error,
    envConfig,
    useMOS,
    useMRE,
    authentication,
    matlab,
    idleTimeoutDuration,
});
