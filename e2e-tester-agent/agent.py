import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime,timezone
import httpx
from mcp.client.streamable_http import streamable_http_client
from strands import Agent
from strands.tools.mcp.mcp_client import MCPClient


GITHUB_MCP_URL = "https://api.githubcopilot.com/mcp/"

github_mcp_client = MCPClient(lambda: streamable_http_client(
    GITHUB_MCP_URL,
    http_client=httpx.AsyncClient(
        headers={"Authorization": f"Bearer {os.environ['GITHUB_PERSONAL_ACCESS_TOKEN']}"},
    ),
))

strands_agent: Agent

REPO_OWNER = "marceloserpa"
REPO_NAME = "github-actions-agent-poc"
REPO_PROJECT_SOURCE="todo-poc"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global strands_agent
    with github_mcp_client:
        strands_agent = Agent(tools=github_mcp_client.list_tools_sync())
        yield


app = FastAPI(title="Strands Agent Server", version="1.0.0", lifespan=lifespan)

class InvocationRequest(BaseModel):
    input: Dict[str, Any]

class InvocationResponse(BaseModel):
    output: Dict[str, Any]

@app.post("/invocations", response_model=InvocationResponse)
async def invoke_agent(request: InvocationRequest):
    try:
        prompt = f"""
        You have access to GitHub MCP tools scoped to the repos and pull_requests toolsets.

        Target repository: {REPO_OWNER}/{REPO_NAME}

        Rules:
        1. NEVER commit directly to the default branch. 
        2. NEVER merge the pull request yourself - only open it.

        Task:
        1. Explain which the app inside {REPO_PROJECT_SOURCE} does.

        """

        
        #user_message = request.input.get("prompt", "")
        #if not user_message:
        #    raise HTTPException(
        #        status_code=400,
        #        detail="No prompt found in input. Please provide a 'prompt' key in the input."
        #    )

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