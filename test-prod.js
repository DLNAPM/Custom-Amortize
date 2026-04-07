import { execSync } from "child_process";
try {
  execSync("npx node server.ts", { env: { ...process.env, NODE_ENV: "production", PORT: "3001" }, stdio: "inherit" });
} catch (e) {
  console.error(e);
}
