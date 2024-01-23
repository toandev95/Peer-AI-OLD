import type { Message } from 'ai';
import type { AgentAction } from 'langchain/schema';
import type { Model } from 'openai/resources';

enum SendKeys {
  Enter = 'Enter',
  CtrlEnter = 'Ctrl + Enter',
}

enum ChatPlugin {
  Search = 'search',
  WebReader = 'web-reader',
  Wikipedia = 'wikipedia',
  ImageGenerator = 'image-generator',
}

type IAgentAction = AgentAction & {
  toolInput: any;
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
  contextSummary?: string;
  contextSummaryMessageId?: string;
};

type IChatMessage = Message & {
  tools?: IAgentAction[];
  isPinned?: boolean;
};

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
