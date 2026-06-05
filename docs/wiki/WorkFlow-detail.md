# WorkFlow detail

A GitHub workflow is an automated process defined by a YAML file that specifies a sequence of jobs and steps to be executed in response to certain events within a repository. These workflows facilitate continuous integration and deployment (CI/CD) pipelines, automating tasks such as building, testing, and deploying code.

In the provided `publish.yml` workflow file, the process is designed to automate the validation, compression, and uploading of a Factorio mod using the `factorio-mod-uploader-action`. Here's a detailed breakdown of each component:

## Basic Workflow Structure

```yaml
name: Publish Factorio Mod

on:
  push:
    branches:
      - main
```

- **`name`**: Assigns a name to the workflow, in this case, "Publish Factorio Mod".
- **`on`**: Specifies the event that triggers the workflow. Here, the workflow is triggered by a push event to the `main` branch.

## Job Configuration

```yaml
jobs:
  publish-mod:
    runs-on: ubuntu-latest
```

- **`jobs`**: Defines a set of tasks to be executed.
- **`publish-mod`**: The identifier for this specific job.
- **`runs-on`**: Specifies the environment for the job; here, it uses the latest Ubuntu runner provided by GitHub.

## Steps

### 1. Checkout Repository

```yaml
- name: Checkout Repository
  uses: actions/checkout@v4
```

Utilizes the `actions/checkout` action to clone the repository's code onto the runner.

### 2. Validate Mod

```yaml
- name: Validate Mod
  uses: TheBrutalX/factorio-mod-uploader-action@v2
  with:
    action: validate
```

Employs the `factorio-mod-uploader-action` with the `validate` action to ensure the mod meets necessary criteria.

### 3. Create Zip

```yaml
- name: Create zip
  uses: TheBrutalX/factorio-mod-uploader-action@v2
  with:
    action: compress
```

Uses the same action with the `compress` parameter to package the mod into a ZIP file, preparing it for upload.

### 4. Upload Mod

```yaml
- name: Upload Mod
  uses: TheBrutalX/factorio-mod-uploader-action@v2
  with:
    action: upload
    factorio-api-key: ${{ secrets.FACTORIO_API_KEY }}
```

Utilizes the action with the `upload` parameter to send the compressed mod to the Factorio Mod Portal. It securely accesses the Factorio API key stored in the repository's secrets.

## Full Example

By structuring the workflow in this manner, the process of validating, compressing, and uploading a Factorio mod is fully automated upon each push to the `main` branch, ensuring consistency and efficiency in mod deployment.

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

## Advanced Example with Auto-Update Version (v2.0.5+)

The latest version introduces the `auto-update-version` feature, which automatically synchronizes your mod's version in `mod_info.yml` with the GitHub release tag:

```yaml
name: Publish Factorio Mod

on:
  push:
    branches:
      - main
  release:
    types: [published]

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
```

> **New in v2.0.5**: When `auto-update-version` is set to `'true'`, the action extracts the version from the GitHub release tag (e.g., `v1.2.3`) and updates `mod_info.yml` before creating the zip file. This ensures your mod version always matches your GitHub release version.

---

## Caution: Use the New API Key Feature

> ⚠️ **CAUTION** ⚠️
>
> When setting up the `publish.yml` workflow for uploading your Factorio mod, **DO NOT** use the "Token" found in your [Factorio Profile](https://factorio.com/profile). Instead, make sure to use the **API Keys** feature introduced for better security and functionality.

## Why Use API Keys?

The "Token" is an older method for authenticating mod uploads and is less secure than the newly introduced API Keys. API Keys provide:

- **Enhanced security**: They are designed for automation purposes and are not tied directly to your account password.
- **Scoped access**: You can restrict the key's access to specific actions, minimizing risk in case of a leak.
- **Better management**: You can create, revoke, and regenerate keys without impacting your account login.

## Generating an API Key

1. Log in to your [Factorio Profile](https://factorio.com/profile).
2. Navigate to the API Keys section.
3. Click **Generate New Key**.
4. Provide a meaningful name and define the scope for the key.
5. Copy the generated API key and save it securely. (You will not be able to see it again!)

## Storing the API Key in GitHub Secrets

To safely use the API key in your GitHub Actions workflow:

1. Go to your GitHub repository.
2. Navigate to **Settings** > **Secrets and variables** > **Actions**.
3. Click **New repository secret**.
4. Name the secret `FACTORIO_API_KEY`.
5. Paste your API key into the value field and save.


