/* eslint-disable import/prefer-default-export */
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

// Don't add NODE_ENV into T3 Env, it changes the tree-shaking behavior
const Env = createEnv({
  server: {
    IDEX_ACCESS_CODES: z.string(),
    OPENAI_API_KEY: z.string().startsWith('sk-'),
    OPENAI_API_URL: z.string().url().optional(),
    OPENAI_DALLE_ENABLED: z.enum(['true', 'false']).optional().default('false'),
    BLOB_READ_WRITE_TOKEN: z.string().startsWith('vercel_blob_').optional(),
  },
  client: {
    NEXT_PUBLIC_OPENAI_DALLE_ENABLED: z
      .enum(['true', 'false'])
      .optional()
      .default('false'),
  },
  runtimeEnv: {
    IDEX_ACCESS_CODES: process.env.IDEX_ACCESS_CODES,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_API_URL: process.env.OPENAI_API_URL,
    OPENAI_DALLE_ENABLED: process.env.OPENAI_DALLE_ENABLED,
    NEXT_PUBLIC_OPENAI_DALLE_ENABLED:
      process.env.NEXT_PUBLIC_OPENAI_DALLE_ENABLED,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  },
});

export { Env };
