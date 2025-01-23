const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

function getInput(name, options) {
  // Check if running in GitHub Actions environment
  if (process.env.GITHUB_ACTIONS) {
    return core.getInput(name, options);
  }

  // CLI argument parsing
  const args = process.argv.slice(2);
  const flagIndex = args.findIndex(
    (arg) => arg === `--${name}` || arg === `-${name.charAt(0)}`
  );

  if (flagIndex === -1) {
    if (options?.required) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return "";
  }

  // Return the value after the flag
  const value = args[flagIndex + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Value not provided for argument: ${name}`);
  }

  return value;
}

async function run() {
  try {
    // Get inputs
    const pathPattern = getInput("paths", { required: true });
    const ownerSlug = getInput("owner-slug", { required: true });
    const continueApiDomain =
      getInput("continue-api-domain") || "api-test.continue.dev";
    const apiKey = getInput("api-key", { required: true });

    let adjustedPattern = pathPattern;
    try {
      // Check if the pattern exactly matches a directory
      const stats = fs.statSync(pathPattern);
      if (stats.isDirectory()) {
        adjustedPattern = path.join(pathPattern, "**", "*.yaml");
      }
    } catch (err) {
      // If path doesn't exist, keep the original pattern
      // This allows glob patterns that don't match actual paths to still work
    }

    const files = glob.sync(adjustedPattern).filter((file) => {
      try {
        return fs.statSync(file).isFile();
      } catch (err) {
        core.warning(`Unable to check file: ${file}. Error: ${err.message}`);
        return false;
      }
    });

    if (files.length === 0) {
      throw new Error("No yaml files found matching the pattern");
    }

    console.log("Uploading packages...");

    for (const filepath of files) {
      const packageSlug = path.basename(filepath, ".yaml");
      const fullSlug = `${ownerSlug}/${packageSlug}`;
      const protocol = continueApiDomain.startsWith("localhost")
        ? "http"
        : "https";
      const url = `${protocol}://${continueApiDomain}/packages/${fullSlug}/versions/new`;

      // Resolve the absolute path of the file
      const absoluteFilePath = path.isAbsolute(filepath)
        ? filepath
        : path.join(process.cwd(), filepath);

      // Check if the file exists
      if (!fs.existsSync(absoluteFilePath)) {
        core.warning(`File not found at path: ${absoluteFilePath}`);
        continue; // Skip to next file
      }

      // Read file contents
      const content = fs.readFileSync(absoluteFilePath, "utf8");

      // Make POST request using built-in fetch
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ content }),
      });

      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        if (
          errorText.includes("Version") &&
          errorText.includes("already exists")
        ) {
          console.log(
            `Package version from ${filepath} already exists in ${fullSlug}`
          );
        } else {
          core.setFailed(
            `Failed to upload ${filepath} to ${fullSlug}: HTTP error ${response.status}: ${errorText}`
          );
        }

        continue;
      }

      const data = await response.json();
      console.log(
        `Successfully published package version from ${filepath} to ${fullSlug}:`,
        data.versionId
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
