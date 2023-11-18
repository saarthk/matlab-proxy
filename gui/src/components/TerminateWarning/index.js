import React from 'react';
import { useDispatch } from 'react-redux';
import { fetchTerminateIntegration } from '../../actionCreators';
import './TerminateWarning.css';

function TerminateWarning({ bufferTimeout, resumeCallback }) {
    const dispatch = useDispatch();

    return (
        <div className="modal show"
            id="information"
            tabIndex="-1"
            role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content alert alert-warning">
                    <div className="modal-header">
                        <span className="alert_icon icon-alert-warning" />
                        <h4 className="modal-title alert_heading" id="information-dialog-title">Warning</h4>
                    </div >
                    <div className="modal-body">
                        <div className="details">
                            <div>MATLAB Proxy will self-terminate in {bufferTimeout} seconds</div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <div id="actions">
                            <button
                                className='btn'
                                onClick={resumeCallback}
                            >
                                <span className='btn-label'>Resume Session</span>
                            </button>
                            <button
                                className='btn'
                                onClick={() => dispatch(fetchTerminateIntegration())}
                            >
                                <span className='btn-label'>Terminate Session</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TerminateWarning;