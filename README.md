# Continue Publish Action

This action publishes a new version of your Continue assistant/block(s)

## Inputs

### `paths`

**Required** The path or glob pattern of `.yaml` files to publish. The name of the file will be used as the assistant/block slug (excluding the `.yaml` extension)

### `owner-slug`

**Required** The slug of the owner of the assistant/block(s) to publish

### `api-key`

**Required** Your Continue API key, can be found at http://app.continue.dev/settings/api-keys

### `is-assistant`

**Optional** Whether the assistant/block is an assistant. Defaults to `false`.

### `private`

**Optional** Whether the assistant/block is private. Defaults to `false`.

## Example usage

```yaml
name: Publish to Continue

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
          owner-slug: continuedev
          paths: ./path/to/config.yaml
          api-key: ${{ secrets.CONTINUE_API_KEY }}
```
