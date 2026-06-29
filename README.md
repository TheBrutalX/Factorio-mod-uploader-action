[![Release](https://github.com/TheBrutalX/factorio-mod-uploader-action/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/TheBrutalX/factorio-mod-uploader-action/actions/workflows/release.yml) [![CodeQL Advanced](https://github.com/TheBrutalX/Factorio-mod-uploader-action/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/TheBrutalX/Factorio-mod-uploader-action/actions/workflows/codeql.yml)

# Factorio Mod Uploader - GitHub Action

This repository hosts a GitHub Action specifically designed to simplify and automate the workflow for packaging and uploading Factorio mods to the [Factorio Mod Portal](https://mods.factorio.com/).

### Key Features

- **Version Control Integration**: Checks out the repository to ensure the latest changes are included.
- **Dependency Management**: Installs all necessary dependencies for the mod build process.
- **Automated Build**: Handles the mod packaging process efficiently.
- **Seamless Deployment**: Automatically uploads the packaged mod to the Factorio Mod Portal.

Streamline your mod development process with this action and ensure your updates are delivered faster and with fewer manual steps.

**Perfect for Factorio mod developers looking for a robust and hands-free deployment solution.**

### Workflow Example

Create a workflow file in `.github/workflows/publish.yml`:

```yaml
name: Publish Factorio Mod

on:
    push:
        branches:
            - main

jobs:
    publish-mod:
        runs-on: ubuntu-latest
        steps:
            - name: Checkout Repository
              uses: actions/checkout@v4

            - name: Validate Mod
              uses: TheBrutalX/factorio-mod-uploader-action@v2
              with:
                  action: validate

            - name: Create zip
              uses: TheBrutalX/factorio-mod-uploader-action@v2
              with:
                  action: compress

            - name: Upload Mod
              uses: TheBrutalX/factorio-mod-uploader-action@v2
              with:
                  action: upload
                  factorio-api-key: ${{ secrets.FACTORIO_API_KEY }}
```

#### Advanced Workflow (with skip-update-details)

If your API token only has "Upload new mod releases" permissions (not "Edit mod details"), use `skip-update-details: true`:

```yaml
name: Publish Factorio Mod

on:
    push:
        branches:
            - main

jobs:
    publish-mod:
        runs-on: ubuntu-latest
        steps:
            - name: Checkout Repository
              uses: actions/checkout@v4

            - name: Validate Mod
              uses: TheBrutalX/factorio-mod-uploader-action@v2
              with:
                  action: validate

            - name: Create zip
              uses: TheBrutalX/factorio-mod-uploader-action@v2
              with:
                  action: compress
                  auto-update-version: 'true'

            - name: Upload Mod
              uses: TheBrutalX/factorio-mod-uploader-action@v2
              with:
                  action: upload
                  factorio-api-key: ${{ secrets.FACTORIO_API_KEY }}
                  skip-update-details: true
```

This is the basic version, for the specific option see the detail of each step

If you need to understand the file I have written a guide in the [Wiki](https://github.com/TheBrutalX/Factorio-mod-uploader-action/wiki/WorkFlow-detail)
## Step overview

See all the details of each step in the [Wiki](https://github.com/TheBrutalX/Factorio-mod-uploader-action/wiki/Avaible-Actions)

- [Validate Mod](https://github.com/TheBrutalX/Factorio-mod-uploader-action/wiki/Avaible-Actions#action-validate)
- [Create Zip](https://github.com/TheBrutalX/Factorio-mod-uploader-action/wiki/Avaible-Actions#action-compress)
- [Upload to Factorio](https://github.com/TheBrutalX/Factorio-mod-uploader-action/wiki/Avaible-Actions#action-upload)
