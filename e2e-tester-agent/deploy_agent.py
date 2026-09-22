import argparse

import boto3

parser = argparse.ArgumentParser()
parser.add_argument('--aws-account-id', required=True, help='AWS account ID')
args = parser.parse_args()

client = boto3.client('bedrock-agentcore-control', region_name='us-east-1')

response = client.create_agent_runtime(
    agentRuntimeName='e2e_tester_agent',
    agentRuntimeArtifact={
        'containerConfiguration': {
            'containerUri': f'{args.aws_account_id}.dkr.ecr.us-east-1.amazonaws.com/e2e-tester-agent:latest'
        }
    },
    networkConfiguration={"networkMode": "PUBLIC"},
    roleArn=f'arn:aws:iam::{args.aws_account_id}:role/AgentRuntimeRole'
)

print(f"Agent Runtime created successfully!")
print(f"Agent Runtime ARN: {response['agentRuntimeArn']}")
print(f"Status: {response['status']}")