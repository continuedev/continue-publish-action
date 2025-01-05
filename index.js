const core = require("@actions/core");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // Get inputs
    const packagesInput = core.getInput("packages", { required: true });
    const packages = JSON.parse(packagesInput); // has path, slug

    const continueApiDomain =
      core.getInput("continue-api-domain") || "api.continue.dev";
    const apiKey = core.getInput("api-key", { required: true });

    if (packages.length === 0) {
      throw new Error("packages input is empty");
    }

    for (const { slug, path } of packages) {
      const url = `https://${continueApiDomain}/packages/${slug}/versions/new`;

      // Resolve the absolute path of the file
      const absoluteFilePath = path.isAbsolute(path)
        ? path
        : path.join(process.cwd(), path);

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
          `Failed to upload ${path}: HTTP error ${response.status}: ${errorText}`
        );
        // Optionally, you can set the action to fail here
        core.setFailed(
          `Failed to upload ${path}: HTTP error ${response.status}: ${errorText}`
        );
        continue;
      }

      const data = await response.json();
      console.log(`Successfully published package version for ${path}:`, data);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
