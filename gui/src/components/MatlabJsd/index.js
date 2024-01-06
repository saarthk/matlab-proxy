// Copyright (c) 2020-2022 The MathWorks, Inc.

import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './MatlabJsd.css';

// The MatlabJSD component is declared using forwardRef. 
// This opts it into receiving the iframeRef as the second ref argument which is declared after props (url).
const MatlabJsd = forwardRef(({ url }, iframeRef) => {
    return (
        <div id="MatlabJsd">
            <iframe
                ref={iframeRef}
                title="MATLAB JSD"
                src={url}
                frameBorder="0"
                allowFullScreen />
        </div>
    );
});

MatlabJsd.propTypes = {
    url: PropTypes.string.isRequired
};

export default MatlabJsd;
