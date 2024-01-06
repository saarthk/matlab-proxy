// Copyright 2020-2023 The MathWorks, Inc.

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// useTimeoutFn hook is used to fire an event/callback when the timer has expired after
// a certain duration
import { useInterval, useTimeoutFn } from 'react-use';
import './App.css';
import Confirmation from '../Confirmation';
import OverlayTrigger from '../OverlayTrigger';
import Overlay from '../Overlay';
import MatlabJsd from '../MatlabJsd';
import LicensingGatherer from '../LicensingGatherer';
import Controls from '../Controls';
import Information from '../Information';
import Help from '../Help';
import Error from '../Error';
import TerminateWarning from '../TerminateWarning';
import {
    selectOverlayVisible,
    selectFetchStatusPeriod,
    selectHasFetchedServerStatus,
    selectLicensingProvided,
    selectMatlabUp,
    selectError,
    selectLoadUrl,
    selectIsConnectionError,
    selectHasFetchedEnvConfig,
    selectAuthEnabled,
    selectIsAuthenticated,
    selectLicensingMhlmHasEntitlements,
    selectIsEntitled,
    selectLicensingInfo,
    selectUseMOS,
    selectUseMRE,
    selectIdleTimeoutDurationInMS,
    selectMatlabBusy,
    selectMatlabStarting,
    selectIsTimeoutEnabled,
    selectMatlabStopping,
} from "../../selectors";

import {
    setOverlayVisibility,
    fetchServerStatus,
    fetchEnvConfig,
    fetchTerminateIntegration,
    updateAuthStatus,
    fetchMatlabBusyStatus,
} from '../../actionCreators';
import blurredBackground from './MATLAB-env-blur.png';
import EntitlementSelector from "../EntitlementSelector";

function App() {
    const dispatch = useDispatch();

    const overlayVisible = useSelector(selectOverlayVisible);
    const fetchStatusPeriod = useSelector(selectFetchStatusPeriod);
    const hasFetchedServerStatus = useSelector(selectHasFetchedServerStatus);
    const hasFetchedEnvConfig = useSelector(selectHasFetchedEnvConfig);
    const licensingProvided = useSelector(selectLicensingProvided);
    const hasEntitlements = useSelector(selectLicensingMhlmHasEntitlements);
    const isEntitled = useSelector(selectIsEntitled);
    const matlabUp = useSelector(selectMatlabUp);
    const error = useSelector(selectError);
    const loadUrl = useSelector(selectLoadUrl);
    const isConnectionError = useSelector(selectIsConnectionError);
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const authEnabled = useSelector(selectAuthEnabled);
    const licensingInfo = useSelector(selectLicensingInfo);
    const useMOS = useSelector(selectUseMOS);
    const useMRE = useSelector(selectUseMRE);
    // Timeout duration is specified in seconds, but useTimeoutFn accepts timeout values in ms.
    const idleTimeoutDurationInMS = useSelector(selectIdleTimeoutDurationInMS);
    const isMatlabBusy = useSelector(selectMatlabBusy);
    const isMatlabStarting = useSelector(selectMatlabStarting);
    const isMatlabStopping = useSelector(selectMatlabStopping);
    const isTimeoutEnabled = useSelector(selectIsTimeoutEnabled);

    const baseUrl = useMemo(() => {
        const url = document.URL
        return url.split(window.location.origin)[1].split('index.html')[0]
    }, [])

    const parseQueryParams = (url) => {
        const queryParams = new URLSearchParams(url.search);
        return queryParams;
    }

    const fullyQualifiedUrl = useMemo(() => {
        // Returns the Fully Qualified URL used to load the page.
        const url = document.URL
        let baseUrlStr = url.split('/index.html')[0]
        return baseUrlStr;
    }, [])

    const htmlToRenderMATLAB = () => {
        let theHtmlToRenderMATLAB = useMOS ? "index-matlabonlineserver.html" : 'index-jsd-cr.html'
        if (useMRE) {
            theHtmlToRenderMATLAB += `?mre=${fullyQualifiedUrl}`
        }
        return theHtmlToRenderMATLAB
    }

    const toggleOverlayVisible = useCallback(
        () => dispatch(setOverlayVisibility(!overlayVisible)),
        [overlayVisible, dispatch]
    );

    const [dialogModel, setDialogModel] = useState(null);

    let dialog;
    if (dialogModel) {
        const closeHandler = () => setDialogModel(null);
        const dismissAllHandler = () => {
            closeHandler();
            toggleOverlayVisible(false);
        };
        switch (dialogModel.type) {
            case 'confirmation':
                const confirm = () => {
                    dispatch(dialogModel.callback());
                    setDialogModel(null);
                };
                dialog = (
                    <Confirmation
                        confirm={confirm}
                        cancel={closeHandler}>
                        {dialogModel.message || ''}
                    </Confirmation>
                );
                break;
            case 'help':
                dialog = (
                    <Help
                        closeHandler={closeHandler}
                        dismissAllHandler={dismissAllHandler}
                    />);
                break;
            default:
                throw new Error(`Unknown dialog type: ${dialogModel.type}.`);
        }
    }
    if (isConnectionError) {
        dialog = (
            <Error
                message="Either this integration terminated or the session ended"
            >
                <p>Attempt to <a href="../">return to a parent app</a></p>
            </Error>
        );
    } else if (error && error.type === "MatlabInstallError") {
        dialog = <Error message={error.message} />;
    }

    useEffect(() => {
        // Initial fetch environment configuration
        if (!hasFetchedEnvConfig) {
            dispatch(fetchEnvConfig());
        }

    }, [dispatch, hasFetchedEnvConfig]);

    useEffect(() => {
        // Initial fetch server status
        if (!hasFetchedServerStatus) {
            dispatch(fetchServerStatus());
        }

    }, [dispatch, hasFetchedServerStatus]);

    // Periodic fetch server status
    useInterval(() => {
        dispatch(fetchServerStatus());
    }, fetchStatusPeriod);

    // Load URL
    useEffect(() => {
        if (loadUrl !== null) {
            window.location.href = loadUrl;
        }
    }, [loadUrl]);

    useEffect(() => {
        const queryParams = parseQueryParams(window.location);
        const token = queryParams.get("mwi_auth_token");

        if (token) {
            dispatch(updateAuthStatus(token));
        }
        window.history.replaceState(null, '', `${baseUrl}index.html`);
    }, [dispatch, baseUrl]);
    
    // state variable to query and modify timer status
    // this is the main timer which will expire after a specified window of inactivity
    // can be set by specifying the environment variable MWI_IDLE_TIMEOUT
    const [isIdleTimerExpired, setisIdleTimerExpired] = useState(false);

    // handles for the cancel and reset functions, as returned by the useTimeoutFn hook
    let idleTimerCancel, idleTimerReset;
    
    // callback that will fire once the main timer expires
    const terminationFn = () => {
        // we need to check if MATLAB is starting or stopping.
        // ideally, a timeout should NOT occur if MATLAB is starting or stopping
        if (!(isMatlabStarting || isMatlabStopping)) {
            dispatch(fetchMatlabBusyStatus());

            if (isMatlabBusy) {
                // reset the timer if MATLAB is busy
                idleTimerReset();
            } else {
                // once the timer has expired, make the overlay visible (if it's not already).
                // this will allow the Termination Warning dialog box to appear, informing
                // the user of an impending termination
                dispatch(setOverlayVisibility(true));
                // set the expiration state to true
                setisIdleTimerExpired(true);
            }
        } else {
            idleTimerReset();
        }
    }

    // create a useTimeoutFn hook, setup the expiration duration and the callback.
    // assign cancel and reset variables to the function handles returned by the hook
    [, idleTimerCancel, idleTimerReset] = useTimeoutFn(terminationFn, idleTimeoutDurationInMS);

    // upon mounting the App component, start the idle timer if user is authenticated 
    // and the idle timeout is enabled. otherwise cancel the timer.
    // this is done to prevent a rogue user from terminating the session via a curl request
    useEffect(() => {
        if ((!authEnabled || isAuthenticated) && isTimeoutEnabled) {
            idleTimerReset();
        } else {
            idleTimerCancel();
        }

        // cancel the timer once the component unmounts
        return () => { idleTimerCancel(); }
    }, [authEnabled, idleTimerCancel, idleTimerReset, isAuthenticated, isTimeoutEnabled]);

    // buffer timer which runs for a few more seconds once the idle timer has expired.
    // this timer will run after the main timer to allow the Termination Warning
    // dialog box to appear on the screen, such that the user is informed of an impending termination
    let bufferTimeout = 10;
    let bufferTimerCancel, bufferTimerReset;
    [, bufferTimerCancel, bufferTimerReset] = useTimeoutFn(() => {
        dispatch(fetchTerminateIntegration());
    }, bufferTimeout * 1000);

    useEffect(() => {
        if (isIdleTimerExpired) {
            // if idle timer has expired, start the buffer timer
            bufferTimerReset();
        } else {
            bufferTimerCancel();
        }

        // cleanup function to ensure buffer timer gets cancelled once
        return () => { bufferTimerCancel(); };
    }, [bufferTimerCancel, bufferTimerReset, isIdleTimerExpired])

    // Display one of:
    // * Confirmation
    // * Help
    // * Error
    // * License gatherer
    // * License selector
    // * Status Information
    let overlayContent;   
    
    // show an impending termination warning if timeout is enabled and the timer has expired.
    // it should have the highest precedence, and should draw above all other windows.
    if (isTimeoutEnabled && isIdleTimerExpired) {
        overlayContent = <TerminateWarning
            bufferTimeout={bufferTimeout}
            resumeCallback={() => {
                idleTimerReset();
                setisIdleTimerExpired(false);
            }} />;
    }
    else if (dialog) {
        // TODO Inline confirmation component build
        overlayContent = dialog;
    }
    // Give precedence to token auth over licensing info ie. once after token auth is done, show licensing if not provided.
    else if ((!licensingProvided) && hasFetchedServerStatus && (!authEnabled || isAuthenticated)) {
        overlayContent = <LicensingGatherer role="licensing" aria-describedby="license-window" />;
    }
    // Show license selector if the user has entitlements and is not currently entitled
    else if (hasEntitlements && !isEntitled) {
        overlayContent = <EntitlementSelector options={licensingInfo.entitlements} />;
    }
    // in all other cases, we will either ask for the token, 
    else if (!dialog) {
        overlayContent = (
            <Information closeHandler={toggleOverlayVisible}>
                <Controls callback={args => setDialogModel(args)} />
            </Information>
        );
    }

    const overlay = overlayVisible ? (
        <Overlay>
            {overlayContent}
        </Overlay>
    ) : null;


    // FIXME Until https://github.com/http-party/node-http-proxy/issues/1342
    // is addressed, use a direct URL in development mode. Once that is
    // fixed, the request will be served by the fake MATLAB Embedded Connector
    // process in development mode

    // MW Internal Comment: See g2992889 for a discussion on why a FQDN is required in the MRE parameter.
    // MW Internal Comment: Using websocket on breaks some UI components : `./index-matlabonlineserver.html?websocket=on&mre=${fullyQualifiedUrl}`;
    const matlabUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:31515/index-jsd-cr.html'
<<<<<<< HEAD
        : `./${htmlToRenderMATLAB()}`;

=======
        : './index-jsd-cr.html';
    
    // Reference to pass to MatlabJSD component
>>>>>>> 5d3d3cb (Added comments)
    const MatlabJsdIframeRef = useRef(null);
    
    let matlabJsd = null;
    if(matlabUp){
        matlabJsd = (!authEnabled || isAuthenticated) 
        ? ( <MatlabJsd url={matlabUrl} ref={MatlabJsdIframeRef} /> ) 
        : <img style={{objectFit: 'fill'}}src={blurredBackground} alt='Blurred MATLAB environment'/> 
    }

    const overlayTrigger = overlayVisible ? null : <OverlayTrigger />;

    // when to listen for user events?
    const listenForEvents = (!authEnabled || isAuthenticated) && isTimeoutEnabled;

    // handler for user events (mouse clicks, key presses etc.)
    const handleUserInteraction = useCallback((e) => {
        idleTimerReset();
        // console.log("User interaction, resetting timer!");
    }, [idleTimerReset]);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const userEvents = ['click', 'mousemove', 'keydown'];

    // IFrame elements "swallow" events, such as mousemove, click, keydown, etc.
    // Unlike other elements, such as div, we cannot add synthetic events to an IFrame directly. 
    // Instead we need to explicity insert event listeners to its DOM node.
    // The idiomatic way to achieve this in React is explained here: https://react.dev/learn/manipulating-the-dom-with-refs

    // This approach works for our purpose since the IFrame source and the MatlabJsd component
    // belong to the same origin, and hence follow the Same Origin policy.
    // **Two URLs are said to have the “same origin” if they have the same protocol, domain and port.
    useEffect(() => {
        // access the DOM node corresponding to the MatlabJSD Iframe 
        const MatlabJsdIframeDom = MatlabJsdIframeRef.current;

        if (matlabUp && listenForEvents) {
            userEvents.forEach((eventName) => {
                MatlabJsdIframeDom.contentWindow.addEventListener(eventName, handleUserInteraction, false);
            });
        }

        // Clean up. Necessary!
        return () => {
            if (MatlabJsdIframeDom && matlabUp && listenForEvents) {
                userEvents.forEach((eventName) => {
                    MatlabJsdIframeDom.contentWindow.removeEventListener(eventName, handleUserInteraction, false);
                });
            }
        }
    }, [matlabUp, listenForEvents, handleUserInteraction, userEvents]);

    return (
        // attach synthetic events (corresponding to user interaction) to the App component
        <div data-testid="app" className="main"
        onClick={listenForEvents ? handleUserInteraction : undefined}
        onMouseMove={listenForEvents ? handleUserInteraction : undefined}
        onKeyDown={listenForEvents ? handleUserInteraction : undefined}
        >
            {overlayTrigger}
            {matlabJsd}
            {overlay}
        </div>
    );
}

export default App;