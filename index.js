const core = require("@actions/core");
const fs = require("fs");
const path = require("path");

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

// If running directly from CLI (not in GitHub Actions)
if (!process.env.GITHUB_ACTIONS && require.main === module) {
  console.log(`
Usage:
  node script.js --packages '{"path": "...", "slug": "..."}' --api-key YOUR_API_KEY [--continue-api-domain domain]

Options:
  -p, --packages            JSON string of package configurations
  -a, --api-key            API key for authentication
  -c, --continue-api-domain Optional domain (defaults to api.continue.dev)
`);
}

async function run() {
  try {
    // Get inputs
    const packagesInput = getInput("packages", { required: true });
    const packages = JSON.parse(packagesInput); // has path, slug

    const continueApiDomain =
      getInput("continue-api-domain") || "api.continue.dev";
    const apiKey = getInput("api-key", { required: true });

    if (packages.length === 0) {
      throw new Error("packages input is empty");
    }

    for (const { slug, path: filepath } of packages) {
      const url = `https://${continueApiDomain}/packages/${slug}/versions/new`;

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
        core.error(
          `Failed to upload ${filepath}: HTTP error ${response.status}: ${errorText}`
        );
        // Optionally, you can set the action to fail here
        core.setFailed(
          `Failed to upload ${filepath}: HTTP error ${response.status}: ${errorText}`
        );
        continue;
      }

      const data = await response.json();
      console.log(
        `Successfully published package version for ${filepath}:`,
        data
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
