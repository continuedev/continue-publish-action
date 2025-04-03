# Contributing

To test the action locally, you can pass parameters as CLI arguments:

```bash
node index.js --paths packages --api-key $CONTINUE_API_KEY --continue-api-domain api-test.continue.dev --owner-slug $ORG_SLUG
```

## Publishing

To publish a new version of the action, update the `version` field in `action.yml` and commit the change. Then, create a tag and push it to GitHub.
