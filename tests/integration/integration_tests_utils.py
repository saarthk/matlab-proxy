# Copyright 2023 The MathWorks, Inc.
# Utility functions for integration testing of matlab-proxy

import asyncio
import os
import socket
import time
import urllib3
import requests
import json


def perform_basic_checks():
    """
    Perform basic checks for the prerequisites for starting
    matlab-proxy
    """
    import matlab_proxy.settings

    # Validate MATLAB before testing
    _, matlab_path = matlab_proxy.settings.get_matlab_executable_and_root_path()

    # Check if MATLAB is in the system path
    assert matlab_path is not None, "MATLAB is not in system path"

    # Check if MATLAB verison is >= R2020b
    assert (
        matlab_proxy.settings.get_matlab_version(matlab_path) >= "R2020b"
    ), "MATLAB version should be R2020b or later"


def matlab_proxy_cmd_for_testing():
    """
    Get command for starting matlab-proxy process

    Returns:
        list(string): Command for starting matlab-proxy process
    """

    import matlab_proxy

    matlab_cmd = [matlab_proxy.get_executable_name()]

    return matlab_cmd


async def start_matlab_proxy_app(out=asyncio.subprocess.PIPE, input_env={}):
    """
    Starts matlab-proxy as a subprocess. The subprocess runs forever unless
    there is any error

    Args:
        input_env (dict, optional): Environment variables to be
        initialized for the subprocess. Defaults to {}.

    Returns:
        Process: subprocess object
    """
    from matlab_proxy.util import system

    cmd = matlab_proxy_cmd_for_testing()
    matlab_proxy_env = os.environ.copy()
    matlab_proxy_env.update(input_env)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        env=matlab_proxy_env,
        stdout=out,
        stderr=out,
    )

    return proc


def send_http_request(
    mwi_app_port, mwi_base_url="", http_endpoint="", method="GET", headers={}
):
    """Send HTTP request to matlab-proxy server.
    Returns HTTP response JSON"""

    uri = f"http://localhost:{mwi_app_port}{mwi_base_url}/{http_endpoint}"

    with urllib3.PoolManager(
        retries=urllib3.Retry(backoff_factor=0.1, backoff_max=300)
    ) as http:
        res = http.request(method, uri, fields=headers)
        return json.loads(res.data.decode("utf-8"))


def wait_matlab_proxy_ready(matlab_proxy_url):
    """
    Wait for matlab-proxy to be up and running

    Args:
        matlab_proxy_url (string): URL to access matlab-proxy
    """

    from matlab_proxy.util import system

    # Wait until the matlab config file is created
    MAX_TIMEOUT = 120 if system.is_linux() else 300
    start_time = time.time()

    while not os.path.exists(str(get_matlab_config_file())) and (
        time.time() - start_time < MAX_TIMEOUT
    ):
        time.sleep(1)

    print("MATLAB PROXY IS READY...")

    try:
        if not os.path.exists(str(get_matlab_config_file())):
            raise FileNotFoundError("Config file is not present on the path")
    except FileNotFoundError:
        print("File does not exist")


def get_random_free_port() -> str:
    """
    Get a random free port

    Returns:
        string: A random free port
    """

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("", 0))
    port = str(s.getsockname()[1])
    s.close()
    return port


def license_matlab_proxy(matlab_proxy_url):
    """
    Use Playwright UI automation to license matlab-proxy.
    Uses TEST_USERNAME and TEST_PASSWORD from environment variables.

    Args:
        matlab_proxy_url (string): URL to access matlab-proxy
    """
    from playwright.sync_api import sync_playwright, expect

    # These are MathWorks Account credentials to license MATLAB
    # Throws 'KeyError' if the following environment variables are not set
    TEST_USERNAME = os.environ["TEST_USERNAME"]
    TEST_PASSWORD = os.environ["TEST_PASSWORD"]

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(matlab_proxy_url)

        # Find the MHLM licensing windows in matlab-proxy
        mhlm_div = page.locator("#MHLM")
        expect(
            mhlm_div,
            "Wait for MHLM licensing window to appear. This might fail if the MATLAB is already licensed",
        ).to_be_visible(timeout=60000)

        # The login iframe is present within the MHLM Div
        login_iframe = mhlm_div.frame_locator("#loginframe")

        # Fills in the username textbox
        email_text_box = login_iframe.locator("#userId")
        expect(
            email_text_box,
            "Wait for email ID textbox to appear",
        ).to_be_visible(timeout=20000)
        email_text_box.fill(TEST_USERNAME)
        email_text_box.press("Enter")

        # Fills in the password textbox
        password_text_box = login_iframe.locator("#password")
        expect(password_text_box, "Wait for password textbox to appear").to_be_visible(
            timeout=20000
        )
        password_text_box.fill(TEST_PASSWORD)
        password_text_box.press("Enter")

        # Verifies if licensing is successful by checking the status information
        status_info = page.get_by_text("Status Information")
        expect(
            status_info,
            "Verify if Licensing is successful. This might fail if incorrect credentials are provided",
        ).to_be_visible(timeout=60000)
        browser.close()


def unlicense_matlab_proxy(matlab_proxy_url):
    """
    Unlicense matlab-proxy that is licensed using online licensing

    Args:
        matlab_proxy_url (string): URL to access matlab-proxy
    """
    import warnings

    max_retries = 3  # Max retries for unlicensing matlab-proxy
    retries = 0

    while retries < max_retries:
        error = None
        try:
            resp = requests.delete(
                matlab_proxy_url + "/set_licensing_info", headers={}, verify=False
            )

            if resp.status_code == requests.codes.OK:
                data = resp.json()
                assert data["licensing"] == None, "matlab-proxy licensing is not unset"
                assert (
                    data["matlab"]["status"] == "down"
                ), "matlab-proxy is not in 'stopped' state"

                # Throw warning if matlab-proxy is unlicensed but with some error
                if data["error"] != None:
                    warnings.warn(
                        f"matlab-proxy is unlicensed but with error: {data['error']}",
                        UserWarning,
                    )
                break
            else:
                resp.raise_for_status()
        except Exception as e:
            error = e
        finally:
            retries += 1

    # If the above code threw error even after maximum retries, then raise error
    if error:
        raise error


def poll_web_service(url, step=1, timeout=60, ignore_exceptions=None):
    """Poll a web service for a 200 response

    Args:
        url (string): URL of the web service
        step (int, optional): Poll Interval. Defaults to 1 second.
        timeout (int, optional): Polling timout. Defaults to 60 seconds.
        ignore_exceptions (tuple, optional): The exceptions that need to be ignored
        within the polling timout. Defaults to None.

    Raises:
        TimeoutError: Error if polling timeout is exceeded

    Returns:
        dict: response dictionary object
    """
    start_time = time.time()
    end_time = start_time + timeout

    while time.time() < end_time:
        try:
            response = requests.get(url, verify=False)
            if response.status_code == 200:
                return response

        except Exception as e:
            if ignore_exceptions and isinstance(e, ignore_exceptions):
                continue  # Ignore specified exceptions
        time.sleep(step)

    raise TimeoutError(
        f"{url} did not return a 200 response within the timeout period {timeout} seconds."
    )


def get_matlab_config_file():
    """
    Gets the path to MATLAB config file generated by matlab-proxy

    Returns:
        string: MATLAB config file path
    """
    from matlab_proxy import settings

    return settings.get()["matlab_config_file"]
