import { execSync } from "child_process";
import fs from "fs";

// Read .env if exists
let envVars = { ...process.env };
try {
  if (fs.existsSync(".env")) {
    const envContent = fs.readFileSync(".env", "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        envVars[key] = value;
      }
    });
  }
} catch (e) {
  console.warn("Could not parse .env file:", e);
}

const token = envVars.CLOUDFLARE_API_TOKEN || envVars.VITE_CLOUDFLARE_API_TOKEN;
const accountId = envVars.CLOUDFLARE_ACCOUNT_ID || envVars.VITE_CLOUDFLARE_ACCOUNT_ID;
const apiKey = envVars.CLOUDFLARE_GLOBAL_API_KEY || envVars.VITE_CLOUDFLARE_GLOBAL_API_KEY;
const email = envVars.CLOUDFLARE_EMAIL || envVars.VITE_CLOUDFLARE_EMAIL;

console.log("Checking Cloudflare Deployment Credentials...");
console.log("- Token present:", !!token);
console.log("- Account ID present:", !!accountId);
console.log("- Global API Key present:", !!apiKey);
console.log("- Email present:", !!email);

const deployEnv = { ...envVars };

if (token) {
  deployEnv.CLOUDFLARE_API_TOKEN = token;
}
if (accountId) {
  deployEnv.CLOUDFLARE_ACCOUNT_ID = accountId;
}
if (apiKey) {
  deployEnv.CLOUDFLARE_API_KEY = apiKey;
}
if (email) {
  deployEnv.CLOUDFLARE_EMAIL = email;
}

try {
  console.log("\nBuilding project...");
  execSync("npm run build", { stdio: "inherit", env: deployEnv });

  console.log("\nDeploying to Cloudflare Pages...");
  execSync("npx wrangler pages deploy dist --project-name teenliwa", {
    stdio: "inherit",
    env: deployEnv,
  });
  console.log("\nDeployment completed successfully!");
} catch (error) {
  console.error("\nDeployment failed:", error.message);
  process.exit(1);
}
