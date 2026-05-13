import { chmod, readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  try {
    // Try to grant execute permissions to binaries (works on Linux/Mac)
    const binDir = join(__dirname, 'node_modules/.bin');
    try {
      const files = await readdir(binDir);
      for (const file of files) {
        try {
          await chmod(join(binDir, file), 0o755);
        } catch (e) {
          // Silently ignore
        }
      }
    } catch (e) {
      // Silently ignore if directory doesn't exist
    }
    
    // Run vite build
    const { stdout, stderr } = await execAsync('vite build');
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
})();
