#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const BACKEND = resolve(ROOT, "apps/medusa/apps/backend");
const backendEnvPath = resolve(BACKEND, ".env");
const rootEnvPath = resolve(ROOT, ".env.local");

const databaseUrl = "postgres://medusa:medusa_dev@127.0.0.1:5432/medusa_store";
const backendEnv = {
  STORE_CORS: "http://localhost:3000,http://localhost:8000,https://docs.medusajs.com",
  ADMIN_CORS: "http://localhost:5173,http://localhost:9000,https://docs.medusajs.com",
  AUTH_CORS: "http://localhost:5173,http://localhost:9000,https://docs.medusajs.com",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "local-dev-jwt-secret-change-before-production",
  COOKIE_SECRET: "local-dev-cookie-secret-change-before-production",
  DATABASE_URL: databaseUrl,
  DB_NAME: "medusa_store",
};

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: options.quiet ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || "";
    throw new Error(`${cmd} ${args.join(" ")} failed${detail ? `\n${detail}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

function psql(sql, { database = "postgres", quiet = false } = {}) {
  return run("psql", ["-h", "127.0.0.1", "-d", database, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    quiet,
  });
}

function writeEnv(path, vars) {
  const body = `${Object.entries(vars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
  writeFileSync(path, body);
}

function readEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trimStart().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        return idx === -1 ? [line, ""] : [line.slice(0, idx), line.slice(idx + 1)];
      }),
  );
}

console.log("Checking local Postgres and Redis...");
run("pg_isready", ["-h", "127.0.0.1", "-p", "5432", "-q"]);
run("redis-cli", ["ping"], { quiet: true });

console.log("Ensuring Medusa Postgres role and database...");
const roleExists = psql("SELECT 1 FROM pg_roles WHERE rolname = 'medusa';", { quiet: true });
if (!roleExists.includes("1")) {
  psql("CREATE ROLE medusa WITH LOGIN PASSWORD 'medusa_dev';");
}
psql("ALTER ROLE medusa WITH LOGIN PASSWORD 'medusa_dev';");

const dbExists = psql("SELECT 1 FROM pg_database WHERE datname = 'medusa_store';", { quiet: true });
if (!dbExists.includes("1")) {
  psql("CREATE DATABASE medusa_store OWNER medusa;");
}

psql("ALTER DATABASE medusa_store OWNER TO medusa;");
psql("GRANT ALL PRIVILEGES ON DATABASE medusa_store TO medusa;");
psql("GRANT ALL ON SCHEMA public TO medusa;", { database: "medusa_store" });
psql("ALTER SCHEMA public OWNER TO medusa;", { database: "medusa_store" });

console.log("Writing local Medusa backend .env...");
writeEnv(backendEnvPath, backendEnv);

console.log("Ensuring root storefront .env.local points at local Medusa...");
const rootEnv = {
  ...readEnv(rootEnvPath),
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://localhost:9000",
};
if (!rootEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
  rootEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_replace_after_seed";
}
writeEnv(rootEnvPath, rootEnv);

console.log("Local Medusa setup files are ready.");
