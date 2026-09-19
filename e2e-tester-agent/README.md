




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


  aws ecr create-repository --repository-name e2e-tester-agent --region us-west-2


#### Build

aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com
docker buildx build --platform linux/arm64 -t <account-id>.dkr.ecr.us-west-2.amazonaws.com/e2e-tester-agent:latest --push .
aws ecr describe-images --repository-name e2e-tester-agent --region us-west-2


