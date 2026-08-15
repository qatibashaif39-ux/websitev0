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

  if (fs.existsSync("dist/server/index.mjs")) {
    let indexContent = fs.readFileSync("dist/server/index.mjs", "utf8");
    indexContent =
      `import ssrService from "./_ssr/ssr.mjs";\nimport ssrRenderer from "./_chunks/ssr-renderer.mjs";\n` +
      indexContent;
    indexContent = indexContent.replace(
      /var services = \{ \["ssr"\]: lazyService\(\(\) => import\("\.\/_ssr\/ssr\.mjs"\)\) \};/g,
      `var services = { ["ssr"]: ssrService };`,
    );
    indexContent = indexContent.replace(
      /var _lazy_\w+ = defineLazyEventHandler\(\(\) => import\("\.\/_chunks\/ssr-renderer\.mjs"\)\);/g,
      `var _lazy_0jRgqU = ssrRenderer;`,
    );
    // Directly delegate fetch to ssrService bypassing H3 response wrapper issues in Cloudflare runtime
    indexContent = indexContent.replace(
      /var cloudflare_module_default = createHandler\([\s\S]*?\n\}\s*\}\);\n/g,
      `var cloudflare_module_default = {
  async fetch(cfRequest, env, context) {
    try {
      const url = new URL(cfRequest.url);
      if (env && env.ASSETS && typeof isPublicAssetURL === "function" && isPublicAssetURL(url.pathname)) {
        const assetRes = await env.ASSETS.fetch(cfRequest);
        if (assetRes && (assetRes.status < 400 || assetRes.status === 304)) {
          return assetRes;
        }
      }
      return await ssrService.fetch(cfRequest, env, context);
    } catch (e) {
      console.error("[Cloudflare Worker Top-Level Error]:", e);
      return new Response("Internal Server Error: " + (e?.message || e), { status: 500 });
    }
  }
};
`,
    );
    fs.writeFileSync("dist/server/index.mjs", indexContent);
    console.log(
      "Patched dist/server/index.mjs with direct ssrService handler for Cloudflare Workers.",
    );

    console.log("\nBundling complete server into dist/server/worker.mjs...");
    execSync(
      "npx esbuild dist/server/index.mjs --bundle --platform=neutral --target=es2022 --format=esm --external:node:* --external:cloudflare:* --outfile=dist/server/worker.mjs",
      {
        stdio: "inherit",
      },
    );

    // Inject error catching and duck-typed Response handler in worker.mjs
    let workerContent = fs.readFileSync("dist/server/worker.mjs", "utf8");
    workerContent = workerContent.replace(
      /return toResponse\(attachResponseHeaders\(eventStorage\.run\(\{ h3Event \}, \(\) => handler2\(request, requestOpts\)\), h3Event\), h3Event\);/g,
      `return Promise.resolve(eventStorage.run({ h3Event }, async () => {
        try {
          const res = await handler2(request, requestOpts);
          if (res && (res instanceof Response || (typeof res === "object" && typeof res.status === "number" && res.headers))) {
            return res;
          }
          return res;
        } catch (err) {
          console.error("[TanStack Start Handler Error]:", err);
          return new Response("TanStack Start Error: " + (err?.message || err) + "\\n" + (err?.stack || ""), {
            status: 500,
            headers: { "content-type": "text/plain; charset=utf-8" }
          });
        }
      })).then((res) => {
        if (res && (res instanceof Response || (typeof res === "object" && typeof res.status === "number" && res.headers))) {
          return res;
        }
        return toResponse(attachResponseHeaders(res, h3Event), h3Event);
      });`,
    );
    fs.writeFileSync("dist/server/worker.mjs", workerContent);
    console.log("Successfully generated and instrumented standalone dist/server/worker.mjs");
  }

  if (fs.existsSync("dist/server/wrangler.json")) {
    const wranglerConfig = JSON.parse(fs.readFileSync("dist/server/wrangler.json", "utf8"));
    wranglerConfig.main = "worker.mjs";
    delete wranglerConfig.no_bundle;
    delete wranglerConfig.rules;
    if (wranglerConfig.assets) {
      wranglerConfig.assets.not_found_handling = "none";
    }
    if (deployEnv.GEMINI_API_KEY) {
      wranglerConfig.vars = wranglerConfig.vars || {};
      wranglerConfig.vars.GEMINI_API_KEY = deployEnv.GEMINI_API_KEY;
    }
    fs.writeFileSync("dist/server/wrangler.json", JSON.stringify(wranglerConfig, null, 2));
    console.log(
      "Configured dist/server/wrangler.json (main = worker.mjs, assets.not_found_handling = none)",
    );
  }

  console.log("\nDeploying to Cloudflare Workers via Wrangler using Nitro config...");
  execSync("npx wrangler deploy --config dist/server/wrangler.json", {
    stdio: "inherit",
    env: deployEnv,
  });
  console.log("\nWorker deployment completed successfully!");
} catch (error) {
  console.log("\nTrying fallback to Cloudflare Pages deploy...");
  try {
    execSync("npx wrangler pages deploy dist/client --project-name teenliwa", {
      stdio: "inherit",
      env: deployEnv,
    });
    console.log("\nPages deployment completed successfully!");
  } catch (pagesError) {
    console.error("\nDeployment failed:", error.message || pagesError.message);
    process.exit(1);
  }
}
