import argparse
import boto3
import json

from botocore.config import Config

parser = argparse.ArgumentParser()
parser.add_argument('--aws-account-id', required=True, help='AWS account ID')
parser.add_argument('--agent-core-suffix', required=True, help='AgentCore Suffix')
args = parser.parse_args()

agent_core_client = boto3.client(
    'bedrock-agentcore',
    region_name='us-east-1',
    config=Config(read_timeout=900, connect_timeout=60, retries={'max_attempts': 1}),
)
payload = json.dumps({
    "input": {"prompt": "Scenario: 1) User create a todo list named weekend tasks. 2) Enter in the details, and add 5 tasks. 3)Mark all as completed. 4) Go back the todo-list management page and should the ‘weekend tasks’ with 5/5.."}
})

response = agent_core_client.invoke_agent_runtime(
    agentRuntimeArn=f'arn:aws:bedrock-agentcore:us-east-1:{args.aws_account_id}:runtime/e2e_tester_agent-{args.agent_core_suffix}',
    runtimeSessionId='dfmeoagmreaklgmrkleafremoigrmtesogmtrskhmtkrlshmt',  # Must be 33+ chars
    contentType='application/json',
    payload=payload,
   # qualifier="DEFAULT"
)

response_body = response['response'].read()
response_data = json.loads(response_body)
print("Agent Response:", response_data)