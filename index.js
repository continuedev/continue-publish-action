const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { promisify } = require("util");
const globAsync = promisify(glob);

async function run() {
  try {
    // Get inputs
    const slug = core.getInput("slug", { required: true });
    const filepathsInput = core.getInput("filepaths", { required: true });
    const continueApiDomain =
      core.getInput("continue-api-domain") || "api.continue.dev";
    const apiKey = core.getInput("api-key", { required: true });

    // Parse filepaths input into an array, supporting comma and newline separators
    const filepathsArray = filepathsInput
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (filepathsArray.length === 0) {
      throw new Error("No file paths provided in 'filepaths' input");
    }

    // Build the URL once
    const url = `https://${continueApiDomain}/packages/${slug}/versions/new`;

    for (const filepathPattern of filepathsArray) {
      // Resolve glob patterns to actual file paths
      const matches = await globAsync(filepathPattern);

      if (matches.length === 0) {
        core.warning(`No files matched for pattern: ${filepathPattern}`);
        continue;
      }

      for (const filepath of matches) {
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
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
