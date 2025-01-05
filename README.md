# Continue Publish Action

This action publishes a new version of your Continue package

## Inputs

### `slug`

**Required** The slug of the package to publish

### `filepath`

**Required** The path to your package's YAML definition file

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
      - "./path/to/config.yaml"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish Package
        uses: continuedev/continue-publish-action
        with:
          slug: continuedev/python-assistant
          filepath: ./path/to/config.yaml
          api-key: ${{ secrets.CONTINUE_API_KEY }}
```
