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
    const configYamlUtils = await import("@continuedev/config-yaml");

    // Get inputs
    const pathPattern = getInput("paths", { required: true });
    const ownerSlug = getInput("owner-slug", { required: true });
    const continueApiDomain =
      getInput("continue-api-domain") || "api.continue.dev";
    const apiKey = getInput("api-key", { required: true });
    const isAssistant = getInput("is-assistant") === "true";

    // Handle both old 'private' and new 'visibility' parameters
    const privateInput = getInput("private");
    const visibilityInput = getInput("visibility") || "public";

    // Determine visibility value
    let visibility;
    if (privateInput !== "") {
      // If private input is provided, use it for backward compatibility
      visibility = privateInput === "true" ? "private" : "public";
    } else {
      // Otherwise use the new visibility input
      visibility = visibilityInput;
    }

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
        const isFile = fs.statSync(file).isFile();
        const hasYamlExtension =
          file.toLowerCase().endsWith(".yaml") ||
          file.toLowerCase().endsWith(".yml");
        return isFile && hasYamlExtension;
      } catch (err) {
        core.warning(`Unable to check file: ${file}. Error: ${err.message}`);
        return false;
      }
    });

    if (files.length === 0) {
      console.log("No yaml files found matching the pattern");
      return;
    }

    console.log("Uploading...");

    for (const filepath of files) {
      const packageSlug = path.basename(filepath, ".yaml");
      const fullSlug = `${ownerSlug}/${packageSlug}`;
      const protocol = continueApiDomain.startsWith("localhost")
        ? "http"
        : "https";
      const packagePageUrl = `${protocol}://hub.continue.dev/platform/${fullSlug}`;
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

      // Lint the file
      try {
        configYamlUtils.parseConfigYaml(content);
      } catch (err) {
        core.setFailed(`⚠️ Invalid YAML file ${filepath}: ${err.message}`);
        continue;
      }

      // Make POST request using built-in fetch
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ content, isAssistant, visibility }),
      });

      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        if (
          errorText.includes("Version") &&
          errorText.includes("already exists")
        ) {
          console.log(
            `Version from ${filepath} already exists at ${packagePageUrl}`
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
        `Successfully published new version from ${filepath} to ${packagePageUrl}:`,
        data.versionId
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
