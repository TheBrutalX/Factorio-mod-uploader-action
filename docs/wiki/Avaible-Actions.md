# Avaible Actions

## Action: validate

The `Validate Mod` step ensures that the `info.json` file in your mod directory is correctly formatted and contains valid information. It performs the following checks:

- Verifies the presence of `info.json`.
- Ensures `info.json` contains `name` and `version` fields.
- Validates the length and format of the mod name.
- Checks if the mod version follows semantic versioning.
- Confirms that the mod version is newer than the version available on the Factorio Mod Portal.

If all checks pass, it exports the mod name, version, and folder as environment variables for subsequent steps.

### Input Parameters

| Parameter    | Description                                             | Required | Default            |
| ------------ | ------------------------------------------------------- | -------- | ------------------ |
| `mod-folder` | Path to the mod folder (specify if not root of project) | No       | `GITHUB_WORKSPACE` |

### Output Variables

| Variable      | Description                |
| ------------- | -------------------------- |
| `MOD_NAME`    | The name of the mod        |
| `MOD_VERSION` | The version of the mod     |
| `MOD_FOLDER`  | The path to the mod folder |

---

## Action: compress

The `Create zip` step packages your mod directory into a zip file. This is useful for preparing the mod for upload to the Factorio Mod Portal. It performs the following actions:

- Reads the mod name, version, and folder from environment variables.
- Creates a temporary directory for the zip file.
- Copies the mod directory to the temporary directory (respecting `.factorioignore` rules).
- Compresses the mod directory into a zip file.
- Exports the path to the created zip file as an environment variable.

### Input Parameters

| Parameter             | Description                                                                                                                                | Required | Default           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------- |
| `mod-name`            | The name of the mod                                                                                                                        | No\*     | (from validate)   |
| `mod-folder`          | Path to the mod folder                                                                                                                     | No\*     | (from validate)   |
| `mod-version`         | The version of the mod                                                                                                                     | No\*     | (from validate)   |
| `dotignore`           | Path to the `.ignore` file to use                                                                                                          | No       | `.factorioignore` |
| `auto-update-version` | Automatically update the version in `mod_info.yml` based on the GitHub release tag (e.g., 'v1.2.3' or '1.2.3'). Set to `'true'` to enable. | No       | `""`              |

> **New in v2.0.5**: The `auto-update-version` parameter allows automatic version synchronization with your GitHub release tag. When enabled, the action extracts the version from `GITHUB_REF` and updates `mod_info.yml` before creating the zip.

### Output Variables

| Variable   | Description                      |
| ---------- | -------------------------------- |
| `ZIP_FILE` | The path to the created zip file |

---

## Action: upload

The `Upload Mod` step uploads the created zip file to the Factorio Mod Portal. It performs the following actions:

- Reads the mod name and zip file path from environment variables.
- Retrieves an upload URL from the Factorio Mod Portal.
- Uploads the zip file to the retrieved URL.
- Confirms the successful upload of the mod.

### Input Parameters

| Parameter          | Description                                   | Required | Default           |
| ------------------ | --------------------------------------------- | -------- | ----------------- |
| `mod-name`         | The name of the mod                           | No\*     | (from validate)   |
| `zip-file`         | The path to the zip file                      | No\*     | (from compress)   |
| `factorio-api-key` | The API key for Factorio                      | **Yes**  |                   |
| `dotignore-file`   | File to ignore specific files during compress | No       | `.factorioignore` |

> **Note**: Parameters marked with \* can be inherited from previous steps' environment variables if not explicitly set.
> **New in v2.0.6**: The `skip-update-details` parameter allows skipping the `ModUpdateDetails` API call. This is useful when your API token only has "Upload new mod releases" permissions and not "Edit mod details" permissions. The call is also automatically skipped when no `mod_info.yml` is present in the mod folder.

### Output Variables

None
