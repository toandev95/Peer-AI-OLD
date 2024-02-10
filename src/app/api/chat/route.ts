import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { ipAddress } from '@vercel/edge';
import { StreamingTextResponse } from 'ai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import {
  AIMessage,
  ChatMessage,
  HumanMessage,
  SystemMessage,
} from 'langchain/schema';
import { Calculator } from 'langchain/tools/calculator';
import _, { filter, includes, isEmpty, isNil, last, startsWith } from 'lodash';
import moment from 'moment';
import type { ServerRuntime } from 'next';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getLangChainStream } from '@/langchain';
import { DallE, GoogleSearch, WebBrowser } from '@/langchain/tools';
import { auth, isTrue } from '@/lib/helpers';
import type { IChatMessage } from '@/types';
import { ChatPlugin } from '@/types';

export const runtime: ServerRuntime = 'edge';

export async function POST(
  req: NextRequest,
): Promise<StreamingTextResponse | Response> {
  if (!(await auth(req))) {
    return new Response(
      'Access is denied due to invalid API key. Please check your API key and try again.',
      { status: 401 },
    );
  }

  const realIp = ipAddress(req) || req.headers.get('x-forwarded-for');
  if (isNil(realIp)) {
    return new Response(
      'Access is denied due to invalid IP address. Please check your IP address and try again.',
      { status: 401 },
    );
  }

  const body = await req.json();

  const messages = filter((body.messages as IChatMessage[]) ?? [], (message) =>
    includes(['system', 'assistant', 'user'], message.role),
  );

  if (isEmpty(messages)) {
    return NextResponse.json(
      { error: 'No messages were found.' },
      { status: 400 },
    );
  }

  const previousMessages = _(messages)
    .slice(0, -1)
    .map((message) => {
      switch (message.role) {
        case 'system':
          return new SystemMessage(message.content);

        case 'assistant':
          return new AIMessage(message.content);

        case 'user':
          return new HumanMessage(message.content);

        default:
          return new ChatMessage(message);
      }
    })
    .value();
  const currentMessage = last(messages) as IChatMessage;

  const {
    openAIKey,
    openAIEndpoint,
    model,
    maxTokens,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    plugins,
    streaming,
    language,
  } = body as {
    openAIKey?: string;
    openAIEndpoint?: string;
    model: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    plugins: ChatPlugin[];
    streaming?: boolean;
    language?: string;
    conversationId?: string;
  };

  const llm = new ChatOpenAI(
    {
      openAIApiKey: openAIKey,
      modelName: model,
      maxTokens,
      temperature,
      topP,
      frequencyPenalty,
      presencePenalty,
      streaming,
      maxConcurrency: 5,
      maxRetries: 3,
    },
    { baseURL: openAIEndpoint || process.env.OPENAI_API_URL },
  );

  const embeddings = new OpenAIEmbeddings(
    {
      openAIApiKey: openAIKey,
      maxConcurrency: 5,
      maxRetries: 3,
    },
    { baseURL: openAIEndpoint || process.env.OPENAI_API_URL },
  );
  const chatHistory = new ChatMessageHistory(previousMessages);

  const memory = new BufferMemory({
    memoryKey: 'chat_history',
    chatHistory,
    returnMessages: true,
    outputKey: 'output',
  });

  const tools: StructuredToolInterface[] = [new Calculator()];

  if (includes(plugins, ChatPlugin.Search)) {
    tools.push(new GoogleSearch(process.env.BROWSERLESS_URL as string));
  }

  if (includes(plugins, ChatPlugin.Wikipedia)) {
    tools.push(new WikipediaQueryRun());
  }

  if (includes(plugins, ChatPlugin.WebReader)) {
    tools.push(
      new WebBrowser(embeddings, process.env.BROWSERLESS_URL as string),
    );
  }

  if (
    isTrue(process.env.OPENAI_DALLE_ENABLED) &&
    includes(plugins, ChatPlugin.ImageGenerator) &&
    startsWith(model, 'gpt-4') // Only support GPT-4 models
  ) {
    tools.push(
      new DallE({
        apiKey: llm.openAIApiKey,
        baseUrl: openAIEndpoint || process.env.OPENAI_API_URL,
      }),
    );
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are PeerAI, a large language model trained by OpenAI.
      Knowledge was cut off at the time of October 2021.
      The current model: ${model}.
      The current time: ${moment().format('LLLL')}.
      User interface language: ${language || 'en'}.`,
    ],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);
  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });
  const executor = new AgentExecutor({
    agent,
    tools,
    memory,
    maxIterations: 2,
  });

  if (!streaming) {
    const result = await executor.invoke({ input: currentMessage.content });

    return new Response(result.output);
  }

  const { stream, handlers } = getLangChainStream();

  executor.invoke({ input: currentMessage.content }, { callbacks: [handlers] });

  return new StreamingTextResponse(stream);
}
