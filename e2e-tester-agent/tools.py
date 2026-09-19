import os
import json
import requests
import subprocess
from strands import tool

# Cap on any single tool result so a verbose test/log output can never blow
# out the model's context window on its own.
_MAX_OUTPUT_CHARS = 4000


def _truncate(text: str, limit: int = _MAX_OUTPUT_CHARS) -> str:
    if len(text) <= limit:
        return text
    omitted = len(text) - limit
    return f"...[{omitted} chars omitted]...\n" + text[-limit:]


def _redact(text: str, secret: str) -> str:
    return text.replace(secret, "***") if secret else text


# Larger cap for file reads — source files routinely exceed the 4000-char
# tool-output cap, and unlike log/stderr output, the START of a file (imports,
# top of a component) matters more than the end, so this truncates from the
# tail instead of the head like `_truncate` does.
_MAX_FILE_CHARS = 12000


def _truncate_head(text: str, limit: int = _MAX_FILE_CHARS) -> str:
    if len(text) <= limit:
        return text
    omitted = len(text) - limit
    return text[:limit] + f"\n...[{omitted} chars omitted]..."


def _resolve_within(root: str, rel_or_abs_path: str) -> str:
    root_real = os.path.realpath(root)
    candidate = rel_or_abs_path if os.path.isabs(rel_or_abs_path) else os.path.join(root, rel_or_abs_path)
    resolved = os.path.realpath(candidate)
    if resolved != root_real and not resolved.startswith(root_real + os.sep):
        raise ValueError(f"Path '{rel_or_abs_path}' escapes the allowed root '{root}'.")
    return resolved


@tool
def clone_repo(repo_url: str, target_dir: str = "/tmp/workspace/repo", branch: str = "main") -> str:
    """
    Clones the target GitHub repo into a scratch directory using a PAT from
    the GITHUB_TOKEN env var, or fast-forwards it if already cloned. Call this
    before listing specs or generating new ones so the working tree is fresh.
    """
    token = os.environ["GITHUB_TOKEN"]
    if not repo_url.startswith("https://"):
        return "Error: repo_url must be an https:// GitHub URL."

    authed_url = repo_url.replace("https://", f"https://x-access-token:{token}@", 1)

    if os.path.isdir(os.path.join(target_dir, ".git")):
        cmd = ["git", "-C", target_dir, "fetch", "--depth", "1", "origin", branch]
    else:
        os.makedirs(os.path.dirname(target_dir), exist_ok=True)
        cmd = ["git", "clone", "--depth", "1", "--branch", branch, authed_url, target_dir]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return f"Error: {_truncate(_redact(result.stderr, token))}"

    if "fetch" in cmd:
        subprocess.run(["git", "-C", target_dir, "reset", "--hard", f"origin/{branch}"], capture_output=True, text=True)

    return f"Repository ready at {target_dir} (branch: {branch})"


@tool
def list_directory(path: str, root_dir: str = "/tmp/workspace/repo") -> str:
    """
    Lists files and subdirectories directly under `path` (relative to root_dir,
    or an absolute path inside it). Filters out node_modules and .git. Use this
    to explore the repo structure before reading specific files with read_file.
    """
    try:
        resolved = _resolve_within(root_dir, path)
    except ValueError as e:
        return f"Error: {e}"
    try:
        entries = sorted(os.listdir(resolved))
    except OSError as e:
        return f"Error: Could not list directory '{path}': {e}"

    entries = [e for e in entries if e not in ("node_modules", ".git")]
    if not entries:
        return f"'{path}' is empty."
    lines = [e + ("/" if os.path.isdir(os.path.join(resolved, e)) else "") for e in entries]
    return _truncate("\n".join(lines))


@tool
def read_file(path: str, root_dir: str = "/tmp/workspace/repo") -> str:
    """
    Reads the full text content of a single file at `path` (relative to
    root_dir, or absolute inside it). Content is truncated if very large.
    Use this to inspect app source (for testIDs/accessibility identifiers)
    and existing e2e spec files (for code style and conventions).
    """
    try:
        resolved = _resolve_within(root_dir, path)
    except ValueError as e:
        return f"Error: {e}"
    if not os.path.isfile(resolved):
        return f"Error: '{path}' is not a file."
    try:
        with open(resolved, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except OSError as e:
        return f"Error: Could not read file '{path}': {e}"
    return _truncate_head(content)


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

    install_res = subprocess.run(["npm", "ci"], cwd=repo_dir, capture_output=True, text=True, env=env)
    if install_res.returncode != 0:
        return f"FAILURE: npm ci failed.\nError Logs:\n{_truncate(install_res.stderr)}"

    test_cmd = ["npm", "run", "test:bstack", "--", "--spec", f"e2e/specs/{spec_file_name}"]
    test_res = subprocess.run(test_cmd, cwd=repo_dir, capture_output=True, text=True, env=env)

    if test_res.returncode == 0:
        return f"SUCCESS: Test passed on BrowserStack!\nOutput:\n{_truncate(test_res.stdout)}"
    else:
        return (
            f"FAILURE: Test failed on BrowserStack.\n"
            f"Error Logs:\n{_truncate(test_res.stderr)}\n"
            f"Output:\n{_truncate(test_res.stdout)}"
        )