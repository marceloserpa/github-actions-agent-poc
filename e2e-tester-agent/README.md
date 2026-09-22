




Terminal window
# Run the application
uv run uvicorn agent:app --host 0.0.0.0 --port 8080

# Test /ping endpoint
curl http://localhost:8080/ping

# Test /invocations endpoint
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"prompt": "What is artificial intelligence?"}
  }'





# Build the image
docker buildx build --platform linux/arm64 -t e2e-tester-agent:arm64 --load .

# Test locally with credentials
docker run --platform linux/arm64 -p 8080:8080 \
  -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  -e AWS_SESSION_TOKEN="$AWS_SESSION_TOKEN" \
  -e AWS_REGION="$AWS_REGION" \
  -e BROWSERSTACK_USERNAME="$BROWSERSTACK_USERNAME" \
  -e BROWSERSTACK_ACCESS_KEY="$BROWSERSTACK_ACCESS_KEY" \
  -e GITHUB_TOKEN="$GITHUB_TOKEN" \
  e2e-tester-agent:arm64




  ====





#### infra

```sh
aws ecr create-repository --repository-name e2e-tester-agent --region us-east-1
```

#### Build

```sh
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

```sh
docker buildx build --platform linux/arm64 -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/e2e-tester-agent:latest --push .
```

```sh
aws ecr describe-images --repository-name e2e-tester-agent --region us-east-1
```




## AWS


```sh
aws secretsmanager create-secret --region us-east-1 \
  --name e2e-tester-agent/browserstack \
  --secret-string "{\"username\":\"$BROWSERSTACK_USERNAME\",\"access_key\":\"$BROWSERSTACK_ACCESS_KEY\"}"
```

```sh
aws secretsmanager create-secret --region us-east-1 \
  --name e2e-tester-agent/github \
  --secret-string "{\"token\":\"$GITHUB_TOKEN\"}"
```

```sh
aws iam put-role-policy \
  --role-name AgentRuntimeRole \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "secretsmanager:GetSecretValue",
        "Resource": [
          "arn:aws:secretsmanager:us-east-1:<<account id>>:secret:e2e-tester-agent/browserstack-*",
          "arn:aws:secretsmanager:us-east-1:<<account id>>:secret:e2e-tester-agent/github-*"
        ]
      }
    ]
  }'
```