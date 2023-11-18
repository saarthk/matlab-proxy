// Copyright 2020-2023 The MathWorks, Inc.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
} from "../../selectors";

import {
    setOverlayVisibility,
    fetchServerStatus,
    fetchEnvConfig,
    fetchTerminateIntegration,
    updateAuthStatus,
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
    // Multiply the timeout value by 1000 to convert to milliseconds.
    const idleTimeoutDurationInMS = useSelector(selectIdleTimeoutDurationInMS);
    const matlabBusy = useSelector(selectMatlabBusy);
    const matlabStarting = useSelector(selectMatlabStarting);
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
    
    const [isTimerExpired, setIsTimerExpired] = useState(false);

    let timerCancel, timerReset;
    [, timerCancel, timerReset] = useTimeoutFn(() => {
        setIsTimerExpired(true);
    }, idleTimeoutDurationInMS);

    // Upon mounting the App component,
    // start the idle timer if user is authenticated and the idle timeout is enabled.
    // (Otherwise cancel the timer)
    useEffect(() => {
        if ((!authEnabled || isAuthenticated) && isTimeoutEnabled) {
            timerReset();
        } else {
            timerCancel();
        }

        // Cancel the timer once the component unmounts
        return () => { timerCancel(); }
    }, [authEnabled, isAuthenticated, isTimeoutEnabled]);

    // Buffer timer which runs for a few more seconds once the idle timer has expired
    let bufferTimeout = 10;
    let bufferTimerCancel, bufferTimerReset;
    [, bufferTimerCancel, bufferTimerReset] = useTimeoutFn(() => {
        dispatch(fetchTerminateIntegration());
    }, bufferTimeout * 1000);

    useEffect(() => {
        if (isTimerExpired) {
            // If idle timer has expired, start the buffer timer
            bufferTimerReset();
        } else {
            bufferTimerCancel();
        }

        // Cleanup function to ensure buffer timer gets cancelled
        return () => { bufferTimerCancel(); };
    }, [isTimerExpired])

    // Display one of:
    // * Confirmation
    // * Help
    // * Error
    // * License gatherer
    // * License selector
    // * Status Information
    let overlayContent;   
    
    // Show an impending termination warning if timeout is enabled and the timer has expired.
    // This should have the highest precedence, and should draw above all other windows.
    if (isTimeoutEnabled && isTimerExpired) {
        overlayContent = <TerminateWarning
            bufferTimeout={bufferTimeout}
            resumeCallback={() => {
                timerReset();
                setIsTimerExpired(false);
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
        : `./${htmlToRenderMATLAB()}`;

    let matlabJsd = null;
    if (matlabUp) {
        matlabJsd = (!authEnabled || isAuthenticated)
            ? (<MatlabJsd url={matlabUrl} />)
            : <img style={{ objectFit: 'fill' }} src={blurredBackground} alt='Blurred MATLAB environment' />
    }

    const overlayTrigger = overlayVisible ? null : <OverlayTrigger />;

    let listenForEvents = (!authEnabled || isAuthenticated) && isTimeoutEnabled;
    const handleEvent = (e) => {
        timerReset();
        console.log("User interaction, resetting timer!");
    };
    
    return (
        <div data-testid="app" className="main"
        onClick={listenForEvents ? handleEvent : undefined}
        onMouseMove={listenForEvents ? handleEvent : undefined}
        >
            {overlayTrigger}
            {matlabJsd}
            {overlay}
        </div>
    );
}

export default App;