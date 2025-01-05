# Continue Publish Action

This action publishes a new version of your Continue package(s)

## Inputs

### `packages`

**Required** The slug/filepath pairs of the packages to publish

### `api-key`

**Required** Your Continue API key, can be found at http://app.continue.dev/settings/api-keys

## Example usage

```yaml
name: Publish Continue Package

on:
  push:
    branches:
      - main
    paths:
      - ./path/to/config.yaml

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: continuedev/continue-publish-action
        with:
          api-key: ${{ secrets.CONTINUE_API_KEY }}
          packages:
            - slug: continuedev/python-assistant
              path: ./path/to/config.yaml
```
