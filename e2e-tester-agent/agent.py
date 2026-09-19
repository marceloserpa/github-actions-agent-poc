import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime,timezone
from strands import Agent
from strands.agent.conversation_manager import SlidingWindowConversationManager

from tools import (
    clone_repo,
    get_latest_browserstack_app_id,
    list_directory,
    read_file,
    execute_ios_test_spec
)


app = FastAPI(title="Strands Agent Server", version="1.0.0")

# System prompt forcing direct, native function calling
SYSTEM_PROMPT = """You are an automated QA Engineer Agent specializing in iOS e2e testing.

CRITICAL INSTRUCTIONS FOR TOOL USAGE:
1. You have direct execution privileges for all provided tools.
2. DO NOT ask for user permission or print messages like "Invoking tool..." or "Confirming tool availability...".
3. Execute function calls immediately via native tool call payloads.
4. Repo URL: https://github.com/marceloserpa/github-actions-agent-poc.git
5. Project root folder (after clone_repo): /tmp/workspace/repo/todo-poc/
6. Tests folder (after clone_repo): /tmp/workspace/repo/todo-poc/e2e/specs/
7. `list_directory`/`read_file` are your only filesystem exploration tools. Never
   assume a path exists — always list a directory before reading a file in it.

STOP CONDITION (do not violate this):
If any single tool call fails (its result starts with "Error:") twice in a row
with the same tool and effectively the same arguments, STOP calling tools
immediately. Do not retry a third time under any circumstance. Instead, output
a final response explaining what you attempted, the exact error message, and
what would be needed to proceed (e.g. a corrected path or missing credential).

First, classify the request into exactly one of the two modes below, then
follow that mode's workflow.

MODE 1 — Run an existing test (the request names or clearly refers to an
already-known scenario/spec, e.g. "run the todo test"):
Step 1: Execute `clone_repo` with the repo URL above to get a fresh working tree.
Step 2: Execute `get_latest_browserstack_app_id` to get the target app_url.
Step 3: Execute `list_directory(path="todo-poc/e2e/specs")` to find the required
    spec file. Do not use any other means to explore the filesystem for this.
Step 4: Execute `execute_ios_test_spec` passing repo_dir=/tmp/workspace/repo/todo-poc,
    the spec name, and app_url.
Step 5: Output the final test summary once the tools finish running.

MODE 2 — Implement a new scenario from a description (the request describes
step-by-step UI behavior, e.g. "Scenario: 1. do x 2. do y..."):
Step 1: Execute `clone_repo` with the repo URL above.
Step 2: Explore the app source under todo-poc/src using `list_directory` and
    `read_file` to find the screens/components relevant to the scenario, and
    collect the REAL testID/accessibility-identifier strings they use. Hard
    rule: never invent a selector — every selector you use later must have
    appeared verbatim in a `read_file` result.
Step 3: Execute `list_directory(path="todo-poc/e2e/specs")`, then `read_file`
    every spec file found to learn existing helper functions, import style,
    describe/it structure, and selector conventions (e.g. `~accessibility-id`
    vs `-ios predicate string`).
Step 4: Judge whether the scenario is already covered by an existing `it(...)`
    block — covered means an existing block exercises the same user-visible
    behavior, not merely the same screen.
Step 5a: If covered, name the covering file and `it` block, quote the relevant
    snippet, and do NOT generate any code.
Step 5b: If not covered, output one complete new spec file's code as your
    final answer, following the conventions observed in Step 3 and using only
    selectors collected in Step 2. Do NOT write the file to disk, do NOT run
    it, do NOT commit it, and do NOT open a pull request — only output the
    code as text.
"""

# Initialize Strands agent WITH tools at creation time
strands_agent = Agent(
    system_prompt=SYSTEM_PROMPT,
    tools=[
        clone_repo,
        get_latest_browserstack_app_id,
        list_directory,
        read_file,
        execute_ios_test_spec,
    ],
    # Reactive trimming trims the OLDEST messages first, so a single oversized
    # tool result near the end of the conversation can survive many retries.
    # Proactive compression keeps the running context below the threshold
    # before that can happen.
    conversation_manager=SlidingWindowConversationManager(
        should_truncate_results=True,
        proactive_compression=True,
    ),
)

class InvocationRequest(BaseModel):
    input: Dict[str, Any]

class InvocationResponse(BaseModel):
    output: Dict[str, Any]

@app.post("/invocations", response_model=InvocationResponse)
async def invoke_agent(request: InvocationRequest):
    try:

        user_scenario = request.input.get("prompt", "")
        if not user_scenario:
            raise HTTPException(
                status_code=400,
                detail="No prompt found in input. Please provide a 'prompt' key in the input."
            )

        # Build prompt incorporating user scenario
        prompt = f"""
        User Task: {user_scenario}

        Execute the testing workflow now using your tools.
        """

        # Call agent (tools are already attached)
        result = strands_agent(prompt)

        response = {
            "message": result.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": "strands-agent",
        }

        return InvocationResponse(output=response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(e)}")

@app.get("/ping")
async def ping():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)