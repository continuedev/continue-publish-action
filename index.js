const core = require("@actions/core");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // Get inputs
    const slug = core.getInput("slug", { required: true });
    const filepath = core.getInput("filepath", { required: true });
    const continueApiDomain =
      core.getInput("continue-api-domain") || "api.continue.dev";
    const apiKey = core.getInput("api-key", { required: true });

    // Resolve the absolute path of the file
    const absoluteFilePath = path.isAbsolute(filepath)
      ? filepath
      : path.join(process.cwd(), filepath);

    // Check if the file exists
    if (!fs.existsSync(absoluteFilePath)) {
      throw new Error(`File not found at path: ${absoluteFilePath}`);
    }

    // Read file contents
    const content = fs.readFileSync(absoluteFilePath, "utf8");

    // Build URL
    const url = `https://${continueApiDomain}/packages/${slug}/versions/new`;

    // Make POST request using built-in fetch
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Successfully published package version:", data);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
