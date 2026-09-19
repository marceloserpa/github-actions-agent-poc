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
    list_e2e_specs,
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

Your required execution workflow:
Step 1: Execute `clone_repo` with the repo URL above to get a fresh working tree.
Step 2: Execute `get_latest_browserstack_app_id` to get the target app_url.
Step 3: Execute `list_e2e_specs` to find the required e2e test spec. Do not use any other
    means to explore the filesystem — this tool is the only source of truth for spec names.
Step 4: Execute `execute_ios_test_spec` passing repo_dir=/tmp/workspace/repo/todo-poc,
    the spec name, and app_url.
Step 5: Output the final test summary once the tools finish running.
"""

# Initialize Strands agent WITH tools at creation time
strands_agent = Agent(
    system_prompt=SYSTEM_PROMPT,
    tools=[
        clone_repo,
        get_latest_browserstack_app_id,
        list_e2e_specs,
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