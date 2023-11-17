import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './TerminateWarning.css';

function TerminateWarning() {
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
                            <div className='flex-container main-flex'>
                                <div className='flex-item-1'>MATLAB Proxy will self-terminate in 60 seconds</div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <div id="actions">
                            <button
                                className='btn'
                                onClick={null}
                            >
                                <span className='btn-label'></span>
                            </button>
                            <button
                                className='btn'
                                onClick={null}
                            >
                                <span className='btn-label'></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TerminateWarning;