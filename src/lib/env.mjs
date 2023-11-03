/* eslint-disable import/prefer-default-export */
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

// Don't add NODE_ENV into T3 Env, it changes the tree-shaking behavior
const Env = createEnv({
  server: {
    IDEX_ACCESS_CODES: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_API_URL: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    IDEX_ACCESS_CODES: process.env.IDEX_ACCESS_CODES,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_API_URL: process.env.OPENAI_API_URL,
  },
});

export { Env };
