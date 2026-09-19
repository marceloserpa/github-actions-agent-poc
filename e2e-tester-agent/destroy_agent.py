import argparse

import boto3

REGION = 'us-east-1'
AGENT_RUNTIME_NAME = 'e2e_tester_agent'
ECR_REPOSITORY_NAME = 'e2e-tester-agent'

parser = argparse.ArgumentParser(description="Delete the AgentCore Runtime and ECR repository created for this POC")
parser.add_argument('--aws-account-id', required=True, help='AWS account ID')
parser.add_argument('--yes', action='store_true', help='Skip confirmation prompt')
args = parser.parse_args()

agentcore_client = boto3.client('bedrock-agentcore-control', region_name=REGION)
ecr_client = boto3.client('ecr', region_name=REGION)

runtimes = [
    r for r in agentcore_client.list_agent_runtimes()['agentRuntimes']
    if r['agentRuntimeName'] == AGENT_RUNTIME_NAME
]

print("The following resources will be permanently deleted:")
for r in runtimes:
    print(f"  - AgentCore Runtime: {r['agentRuntimeId']} (status: {r['status']})")
print(f"  - ECR repository: {ECR_REPOSITORY_NAME} (region: {REGION}, including all images)")

if not runtimes:
    print(f"  (no AgentCore Runtime named '{AGENT_RUNTIME_NAME}' found)")

if not args.yes:
    confirm = input("\nType 'yes' to proceed: ")
    if confirm.strip().lower() != 'yes':
        print("Aborted.")
        raise SystemExit(1)

for r in runtimes:
    agentcore_client.delete_agent_runtime(agentRuntimeId=r['agentRuntimeId'])
    print(f"Deleted AgentCore Runtime: {r['agentRuntimeId']}")

try:
    ecr_client.delete_repository(repositoryName=ECR_REPOSITORY_NAME, force=True)
    print(f"Deleted ECR repository: {ECR_REPOSITORY_NAME}")
except ecr_client.exceptions.RepositoryNotFoundException:
    print(f"ECR repository '{ECR_REPOSITORY_NAME}' not found, skipping.")

print("\nDone. Note: the IAM role 'AgentRuntimeRole' and its CloudWatch log group were left in place (no ongoing cost).")
