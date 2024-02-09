import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { AIStreamCallbacksAndOptions } from 'ai';
import { createCallbacksTransformer } from 'ai';
import type { AgentAction } from 'langchain/schema';
import { pick } from 'lodash';

type LangChainAIStream = {
  stream: ReadableStream<any>;
  writer: WritableStreamDefaultWriter<string>;
  handlers: BaseCallbackHandler;
};

const getLangChainStream = (
  callbacks?: AIStreamCallbacksAndOptions,
): LangChainAIStream => {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const runs = new Set();

  const handleError = async (e: Error, runId: string) => {
    runs.delete(runId);

    await writer.ready;
    await writer.write(`${JSON.stringify({ data: e.message })}\n`);
    await writer.abort(e);
  };

  const handleStart = async (runId: string) => {
    runs.add(runId);
  };

  const handleEnd = async (runId: string) => {
    runs.delete(runId);

    if (runs.size === 0) {
      await writer.ready;
      await writer.close();
    }
  };

  return {
    stream: stream.readable.pipeThrough(createCallbacksTransformer(callbacks)),
    writer,
    handlers: BaseCallbackHandler.fromMethods({
      handleAgentAction: async (action: AgentAction) => {
        await writer.ready;
        await writer.write(
          `${JSON.stringify({ data: pick(action, ['tool', 'toolInput']) })}\n`,
        );
      },

      handleLLMNewToken: async (token: string) => {
        await writer.ready;
        await writer.write(`${JSON.stringify({ data: token })}\n`);
      },
      handleLLMStart: async (_llm: any, _prompts: string[], runId: string) => {
        await handleStart(runId);
      },
      handleLLMEnd: async (_output: any, runId: string) => {
        await handleEnd(runId);
      },
      handleLLMError: async (e: Error, runId: string) => {
        await handleError(e, runId);
      },

      handleChainStart: async (_chain: any, _inputs: any, runId: string) => {
        await handleStart(runId);
      },
      handleChainEnd: async (_outputs: any, runId: string) => {
        await handleEnd(runId);
      },
      handleChainError: async (e: Error, runId: string) => {
        await handleError(e, runId);
      },

      handleToolStart: async (_tool: any, _input: string, runId: string) => {
        await handleStart(runId);
      },
      handleToolEnd: async (_output: string, runId: string) => {
        await handleEnd(runId);
      },
      handleToolError: async (e: Error, runId: string) => {
        await handleError(e, runId);
      },
    }),
  };
};

export { getLangChainStream };
