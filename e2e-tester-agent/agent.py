import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime,timezone
from strands import Agent
from strands_tools import file_read, editor, shell

from tools import (
    get_latest_browserstack_app_id,
    execute_ios_test_spec
)


app = FastAPI(title="Strands Agent Server", version="1.0.0")

# System prompt forcing direct, native function calling
SYSTEM_PROMPT = """You are an automated QA Engineer Agent specializing in iOS e2e testing.

CRITICAL INSTRUCTIONS FOR TOOL USAGE:
1. You have direct execution privileges for all provided tools.
2. DO NOT ask for user permission or print messages like "Invoking tool..." or "Confirming tool availability...".
3. Execute function calls immediately via native tool call payloads.
4. Project root folder: ../todo-poc/
5. Tests folder: ../todo-poc/e2e/

Your required execution workflow:
Step 1: Execute `get_latest_browserstack_app_id` to get the target app_url.
Step 2: Inspect ../todo-poc/e2e/ to find the required e2e test spec.
Step 3: Execute `execute_ios_test_spec` passing the spec name and app_url.
Step 4: Output the final test summary once the tools finish running.
"""

# Initialize Strands agent WITH tools at creation time
strands_agent = Agent(
    system_prompt=SYSTEM_PROMPT,
    tools=[
        file_read,
        editor,
        shell,
        get_latest_browserstack_app_id,
        execute_ios_test_spec,
    ],
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