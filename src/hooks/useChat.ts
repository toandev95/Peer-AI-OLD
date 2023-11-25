/* eslint-disable @typescript-eslint/no-shadow, no-param-reassign, no-await-in-loop, no-constant-condition */

import type {
  ChatRequest,
  ChatRequestOptions,
  CreateMessage as RawCreateMessage,
  UseChatOptions,
} from 'ai';
import { createChunkDecoder } from 'ai';
import _, {
  // filter,
  // findIndex,
  has,
  // includes,
  isEmpty,
  isNil,
  isString,
  map,
} from 'lodash';
import moment from 'moment';
import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyedMutator } from 'swr';
import useSWR from 'swr';

import { isJSON, uuid } from '@/lib/helpers';
import type { IAgentAction, IChatMessage as Message } from '@/types';

type CreateMessage = RawCreateMessage & { tools?: IAgentAction[] };

type UseChatHelpers = {
  input: string;
  messages: Message[];
  data?: any;
  error: undefined | Error;
  metadata?: Object;
  isLoading: boolean;
  setInput: Dispatch<SetStateAction<string>>;
  setMessages: (messages: Message[]) => void;
  append: (
    message: Message | CreateMessage,
    options?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  reload: (options?: ChatRequestOptions) => Promise<string | null | undefined>;
  stop: () => void;
  handleInputChange: (
    ev: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  handleSubmit: (
    ev: FormEvent<HTMLFormElement>,
    options?: ChatRequestOptions,
  ) => void;
};

const getStreamedResponse = async (
  api: string,
  chatRequest: ChatRequest,
  mutate: KeyedMutator<Message[]>,
  extraMetadataRef: MutableRefObject<any>,
  messagesRef: MutableRefObject<Message[]>,
  abortControllerRef: MutableRefObject<AbortController | null>,
  onFinish?: (message: Message) => void,
  onResponse?: (response: Response) => void | Promise<void>,
) => {
  const previousMessages = messagesRef.current;
  mutate(chatRequest.messages, false);

  const { messages } = chatRequest;

  const res = await fetch(api, {
    method: 'POST',
    body: JSON.stringify({
      messages: map(messages, ({ role, content }) => ({
        role,
        content,
      })),
      ...extraMetadataRef.current.body,
      ...(!isNil(chatRequest.options) && !isNil(chatRequest.options.body)
        ? chatRequest.options.body
        : {}),
    }),
    credentials: extraMetadataRef.current.credentials,
    headers: {
      ...extraMetadataRef.current.headers,
      ...(!isNil(chatRequest.options) && !isNil(chatRequest.options.headers)
        ? chatRequest.options.headers
        : {}),
    },
    ...(!isNil(abortControllerRef.current)
      ? { signal: abortControllerRef.current.signal }
      : {}),
  }).catch((err) => {
    mutate(previousMessages, false);

    throw err;
  });

  if (!isNil(onResponse)) {
    await onResponse(res);
  }

  if (!res.ok) {
    mutate(previousMessages, false);

    throw new Error((await res.text()) || 'Failed to fetch the chat response.');
  }

  if (isNil(res.body)) {
    throw new Error('The response body is empty.');
  }

  const decode = createChunkDecoder();
  const reader = res.body.getReader();

  let streamedResponse = '';

  const message: Message = {
    id: uuid(),
    role: 'assistant',
    content: '',
    createdAt: moment().toDate(),
  };

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    streamedResponse += decode(value);

    message.tools = [];
    message.content = '';

    const lines = _(streamedResponse)
      .split('\n')
      .filter((line) => isJSON(line))
      .map((line) => JSON.parse(line) as { data: any })
      .value();

    for (const { data } of lines) {
      if (has(data, 'tool')) {
        message.tools.push(data as IAgentAction);
      } else if (isString(data)) {
        message.content += data;
      }
    }

    mutate([...chatRequest.messages, { ...message }], false);

    if (abortControllerRef.current === null) {
      reader.cancel();

      break;
    }
  }

  if (!isNil(onFinish)) {
    onFinish(message);
  }

  return message;
};

const useChat = ({
  api = '/api/chat',
  id,
  initialInput = '',
  initialMessages = [],
  credentials,
  headers,
  body,
  onResponse,
  onFinish,
  onError,
}: UseChatOptions = {}): UseChatHelpers => {
  const hookId = useId();
  const chatId = id || hookId;

  const { data: messages, mutate } = useSWR<Message[]>([api, chatId], null, {
    fallbackData: initialMessages,
  });

  const { data: isLoading = false, mutate: mutateLoading } = useSWR<boolean>(
    [chatId, 'loading'],
    null,
  );

  const { data: streamData } = useSWR<any>([chatId, 'streamData'], null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(messages || []);
  const extraMetadataRef = useRef<{
    credentials?: RequestCredentials;
    headers?: Record<string, string> | Headers;
    body?: object;
  }>({ credentials, headers, body });

  const [error, setError] = useState<undefined | Error>();
  const [input, setInput] = useState(initialInput);

  useEffect(() => {
    messagesRef.current = messages || [];
  }, [messages]);

  useEffect(() => {
    extraMetadataRef.current = { credentials, headers, body };
  }, [credentials, headers, body]);

  const setMessages = useCallback(
    (messages: Message[]) => {
      mutate(messages, false);

      messagesRef.current = messages;
    },
    [mutate],
  );

  const triggerRequest = useCallback(
    async (chatRequest: ChatRequest) => {
      try {
        mutateLoading(true);
        setError(undefined);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        await getStreamedResponse(
          api,
          chatRequest,
          mutate,
          extraMetadataRef,
          messagesRef,
          abortControllerRef,
          onFinish,
          onResponse,
        );

        abortControllerRef.current = null;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          abortControllerRef.current = null;

          return null;
        }

        if (onError && err instanceof Error) {
          onError(err);
        }

        setError(err as Error);
      } finally {
        mutateLoading(false);
      }

      return null;
    },
    [api, mutate, mutateLoading, onError, onFinish, onResponse],
  );

  const append = useCallback(
    async (
      message: Message | CreateMessage,
      { options }: ChatRequestOptions = {},
    ) => {
      if (isNil(message.id)) {
        message.id = uuid();
      }

      const chatRequest: ChatRequest = {
        messages: messagesRef.current.concat(message as Message),
        options,
      };

      return triggerRequest(chatRequest);
    },
    [triggerRequest],
  );

  const reload = useCallback(
    async ({ options }: ChatRequestOptions = {}) => {
      if (messagesRef.current.length === 0) {
        return null;
      }

      const lastMessage = messagesRef.current[messagesRef.current.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const chatRequest: ChatRequest = {
          messages: messagesRef.current.slice(0, -1),
          options,
        };

        return triggerRequest(chatRequest);
      }

      const chatRequest: ChatRequest = {
        messages: messagesRef.current,
        options,
      };

      return triggerRequest(chatRequest);
    },
    [triggerRequest],
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(
    (
      e: FormEvent<HTMLFormElement>,
      { options }: ChatRequestOptions = {},
      metadata?: Object,
    ) => {
      if (metadata) {
        extraMetadataRef.current = {
          ...extraMetadataRef.current,
          ...metadata,
        };
      }

      e.preventDefault();

      if (isNil(input) || isEmpty(input)) {
        return;
      }

      append(
        {
          role: 'user',
          content: input,
          createdAt: moment().toDate(),
        },
        { options },
      );

      setInput('');
    },
    [input, append],
  );

  const handleInputChange = (
    ev: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(ev.target.value);
  };

  return {
    input,
    messages: messages || [],
    error,
    data: streamData,
    isLoading,
    append,
    reload,
    stop,
    setMessages,
    setInput,
    handleInputChange,
    handleSubmit,
  };
};

export type { CreateMessage, Message, UseChatOptions };
export { useChat };
