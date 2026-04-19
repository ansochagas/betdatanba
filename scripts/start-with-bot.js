const { spawn } = require("child_process");

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const isProduction = process.env.NODE_ENV === "production";

const appProcess = spawn(
  npxCommand,
  isProduction ? ["next", "start", "-H", "0.0.0.0"] : ["next", "dev"],
  {
    stdio: "inherit",
    shell: false,
    env: process.env,
  }
);

const workerProcess = spawn(npxCommand, ["tsx", "scripts/telegram-worker.ts"], {
  stdio: "inherit",
  shell: false,
  env: process.env,
});

const children = [appProcess, workerProcess];

const shutdown = (code = 0) => {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
};

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
