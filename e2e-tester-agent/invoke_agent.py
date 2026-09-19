import argparse
import boto3
import json

parser = argparse.ArgumentParser()
parser.add_argument('--aws-account-id', required=True, help='AWS account ID')
parser.add_argument('--agent-core-suffix', required=True, help='AgentCore Suffix')
args = parser.parse_args()

agent_core_client = boto3.client('bedrock-agentcore', region_name='us-east-1')
payload = json.dumps({
    "input": {"prompt": "Explain machine learning in simple terms"}
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