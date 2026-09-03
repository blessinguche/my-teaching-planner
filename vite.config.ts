import path from "node:path";
import os from "node:os";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Keep Vite's deps cache off Dropbox — Windows + Dropbox locks
// node_modules/.vite and causes EBUSY on rmdir/rename.
const cacheDir = path.join(os.homedir(), ".cache", "myteachingplanner-vite");

export default defineConfig({
  plugins: [react()],
  cacheDir,
});
