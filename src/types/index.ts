import type { PutBlobResult } from '@vercel/blob';
import type { AgentAction } from 'langchain/schema';
import type { Model } from 'openai/resources';

import type { Message } from '@/hooks';

enum SendKeys {
  Enter = 'Enter',
  CtrlEnter = 'Ctrl + Enter',
}

enum ChatPlugin {
  Search = 'search',
  WebReader = 'web-reader',
  Wikipedia = 'wikipedia',
  PDFReader = 'pdf-reader',
  ImageGenerator = 'image-generator',
}

type IAgentAction = AgentAction & {
  toolInput: { input: string };
};

type IChat = {
  id: string;
  title: string;
  createdAt: string;
  messages: IChatMessage[];
  settings: IChatSetting;
  input?: string;
  mask?: IMask;
  isTitleGenerated?: boolean;
  attachments?: PutBlobResult[];
  contextSummary?: string;
  contextSummaryMessageId?: string;
};

type IChatMessage = Message & { tools?: IAgentAction[] };

type IChatSetting = {
  model?: Model['id'];
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  plugins: ChatPlugin[];
};

type IPrompt = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  builtIn: boolean;
};

type IMask = {
  id: string;
  emoji: string;
  title: string;
  messages: IChatMessage[] & { id?: string };
  createdAt: string;
  builtIn: boolean;
};

export type { IAgentAction, IChat, IChatMessage, IChatSetting, IMask, IPrompt };
export { ChatPlugin, SendKeys };