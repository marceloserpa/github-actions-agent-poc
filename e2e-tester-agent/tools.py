import os
import json
import requests
import subprocess
from strands import tool

@tool
def get_latest_browserstack_app_id(custom_id: str = None) -> str:
    """
    Fetches the latest uploaded .ipa app_url from BrowserStack App Automate API,
    or returns the pre-configured custom_id (bs://...).
    """
    if custom_id and custom_id.startswith("bs://"):
        return custom_id

    username = os.environ["BROWSERSTACK_USERNAME"]
    access_key = os.environ["BROWSERSTACK_ACCESS_KEY"]
    
    # Query BrowserStack API for recently uploaded apps
    url = "https://api-cloud.browserstack.com/app-automate/recent_apps"
    response = requests.get(url, auth=(username, access_key))
    
    if response.status_code == 200:
        apps = response.json()
        if apps:
            latest_app_url = apps[0].get("app_url")
            return latest_app_url
            
    return "Error: Could not retrieve latest app_url from BrowserStack."

@tool
def execute_ios_test_spec(repo_dir: str, spec_file_name: str, app_url: str) -> str:
    """
    Executes the generated spec file against BrowserStack real iOS devices 
    using the provided BrowserStack app_url (bs://...).
    """    
    env = os.environ.copy()
    env["BROWSERSTACK_APP_PATH"] = app_url
    env["PLATFORM"] = "ios"

    test_cmd = ["npm", "run", "test:bstack", "--", "--spec", f"e2e/specs/{spec_file_name}"]
    test_res = subprocess.run(test_cmd, cwd=repo_dir, capture_output=True, text=True, env=env)
    
    if test_res.returncode == 0:
        return f"SUCCESS: Test passed on BrowserStack!\nOutput:\n{test_res.stdout}"
    else:
        return f"FAILURE: Test failed on BrowserStack.\nError Logs:\n{test_res.stderr}\nOutput:\n{test_res.stdout}"