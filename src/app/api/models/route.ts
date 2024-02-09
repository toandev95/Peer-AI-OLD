import _, { includes, isEqual } from 'lodash';
import type { ServerRuntime } from 'next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { auth } from '@/lib/helpers';

export const runtime: ServerRuntime = 'edge';

export async function POST(req: NextRequest): Promise<NextResponse<any>> {
  if (!(await auth(req))) {
    return NextResponse.json({}, { status: 401 });
  }

  try {
    const { openAIKey, openAIEndpoint } = (await req.json()) as {
      openAIKey?: string;
      openAIEndpoint?: string;
    };

    const openai = new OpenAI({
      apiKey: openAIKey,
      baseURL: openAIEndpoint || process.env.OPENAI_API_URL,
    });

    const { data } = await openai.models.list();
    const models = _(data)
      .filter((model) => isEqual(model.owned_by, 'openai'))
      // .filter((model) => startsWith(model.id, 'gpt-'))
      .filter((model) => includes(['gpt-4', 'gpt-3.5-turbo'], model.id))
      .orderBy((model) => model.created, 'desc')
      .map((model) => model.id)
      .value();

    return NextResponse.json(models);
  } catch (e: any) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
