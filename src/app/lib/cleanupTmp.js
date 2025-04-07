// File: scripts/cleanup-tmp.js
const { readdir, stat, rm } = require("fs/promises");
const { join } = require("path");

/**
 * Cleanup temporary files
 * Run with: npm run cleanup
 */
async function cleanupTempFiles() {
  try {
    const tmpDir = join(process.cwd(), "tmp");
    const now = Date.now();

    // Get cleanup period from env or default to 24 hours
    const cleanupPeriodHours = parseInt(process.env.CLEANUP_PERIOD || "24", 10);
    const CLEANUP_PERIOD = cleanupPeriodHours * 60 * 60 * 1000;

    console.log(`Cleaning up files older than ${cleanupPeriodHours} hours...`);

    // Read all directories in tmp
    const directories = await readdir(tmpDir, { withFileTypes: true });
    let removedCount = 0;

    for (const dir of directories) {
      if (dir.isDirectory()) {
        const dirPath = join(tmpDir, dir.name);
        const dirStat = await stat(dirPath);

        // Check if directory is older than cleanup period
        if (now - dirStat.mtimeMs > CLEANUP_PERIOD) {
          // Remove the directory and all its contents
          await rm(dirPath, { recursive: true, force: true });
          console.log(`Removed old temporary directory: ${dirPath}`);
          removedCount++;
        }
      }
    }

    console.log(
      `Temporary file cleanup completed. Removed ${removedCount} directories.`
    );
  } catch (error) {
    console.error("Error cleaning up temporary files:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTempFiles();
