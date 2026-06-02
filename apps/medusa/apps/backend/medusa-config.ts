import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  // Use Redis for the event bus, cache, and workflow engine instead of the
  // in-memory defaults (removes the "Local Event Bus" dev warning and lets
  // background jobs / subscribers run reliably).
  modules: [
    {
      key: Modules.EVENT_BUS,
      resolve: "@medusajs/event-bus-redis",
      options: { redisUrl: REDIS_URL },
    },
    {
      key: Modules.CACHE,
      resolve: "@medusajs/cache-redis",
      options: { redisUrl: REDIS_URL },
    },
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: "@medusajs/workflow-engine-redis",
      options: { redis: { url: REDIS_URL } },
    },
  ],
})
