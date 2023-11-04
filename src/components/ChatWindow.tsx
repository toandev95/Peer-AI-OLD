'use client';

import type { PutBlobResult } from '@vercel/blob';
import _, {
  cloneDeep,
  filter,
  findIndex,
  includes,
  isEmpty,
  isEqual,
  isNil,
  last,
  lastIndexOf,
  map,
  pick,
  takeWhile,
} from 'lodash';
import moment from 'moment';
import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RiCloseCircleLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiLoader3Line,
  RiMagicLine,
  RiPencilLine,
  RiPlug2Line,
  RiSendPlane2Line,
  RiSettings4Line,
} from 'react-icons/ri';
import { VscClearAll, VscFilePdf } from 'react-icons/vsc';
import TextareaAutosize from 'react-textarea-autosize';
import { useToggle } from 'react-use';

import {
  useBreakpoint,
  useChat,
  useChatScrollAnchor,
  useEnterSubmit,
  useFileUpload,
  useToast,
} from '@/hooks';
import { emptyToUndefined, truncate, uuid } from '@/lib/helpers';
import { useChatStore, useConfigStore, usePromptStore } from '@/stores';
import type { IChat, IChatMessage, IPrompt } from '@/types';
import { ChatPlugin } from '@/types';

import { AppBar, AppBarIconButton } from './AppBar';
import { ChatBubble } from './ChatBubble';
import {
  ToolbarIconButton,
  ToolbarPluginItem,
  ToolbarSettingItem,
} from './ChatToolbar';
import { Button } from './UI/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './UI/Dialog';
import { FadeIn } from './UI/FadeIn';
import { Input } from './UI/Input';
import { Popover, PopoverContent, PopoverTrigger } from './UI/Popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './UI/Select';
import { SliderInput } from './UI/Slider';

const EditChatNameButton = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (newTitle: string) => void;
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>(value);

  const handleSubmit = (ev: ChangeEvent<HTMLFormElement>) => {
    ev.preventDefault();

    onChange(newTitle);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
          <AppBarIconButton IconComponent={RiPencilLine} />
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Conversation</DialogTitle>
          <DialogDescription>
            Give this conversation a new name.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col items-end gap-4" onSubmit={handleSubmit}>
          <Input
            type="text"
            defaultValue={value}
            placeholder="Conversation name"
            onChange={(ev) => setNewTitle(ev.currentTarget.value.trim())}
          />
          <Button
            type="submit"
            disabled={isEmpty(newTitle)}
            onClick={() => onChange(newTitle)}
          >
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ChatWindow = ({ id }: { id: IChat['id'] }) => {
  const { toast } = useToast();
  const breakpoint = useBreakpoint();

  const promptStore = usePromptStore();
  const configStore = useConfigStore();

  const getChatById = useChatStore((state) => state.getChatById);
  const updateChatTitle = useChatStore((state) => state.updateChatTitle);
  const updateChatInput = useChatStore((state) => state.updateChatInput);
  const updateChatSummary = useChatStore((state) => state.updateChatSummary);
  const updateChatSettings = useChatStore((state) => state.updateChatSettings);
  const updateChatAttachments = useChatStore(
    (state) => state.updateChatAttachments,
  );
  const syncMessages = useChatStore((state) => state.syncMessages);

  const currentChat = getChatById(id);

  const [endIndex, setEndIndex] = useState<number>(configStore.paginationSize);
  const [isShowToolbarPrompt, setIsShowToolbarPrompt] = useToggle(false);

  const { formRef, onKeyDown } = useEnterSubmit(configStore.sendKey);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    ref: fileRef,
    isUploading,
    handleFilePicker,
    handleFileChange,
  } = useFileUpload({
    onUploaded: (file: PutBlobResult) => {
      updateChatAttachments(currentChat.id, [
        ...(currentChat.attachments || []),
        file,
      ]);
    },
    onError: (err: Error) => {
      toast({ description: err.message });
    },
  });

  const handleGenerateTitle = async () => {
    const chat = getChatById(id);

    const filteredMessages = filter(chat.messages, (message) =>
      includes(['assistant', 'user'], message.role),
    );

    if (chat.isTitleGenerated || filteredMessages.length < 4) {
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          openAIKey: emptyToUndefined(configStore.openAIKey),
          openAIEndpoint: emptyToUndefined(configStore.openAIEndpoint),
          messages: [
            ...filteredMessages,
            {
              role: 'user',
              content: `Based on our conversation, generate a 4-6 word title that captures its essence.
            The title should not contain introductions, punctuation (including quotation marks), periods, symbols, or additional text.`,
            },
          ],
          streaming: false,
        }),
        headers: {
          ...(!isNil(emptyToUndefined(configStore.accessCode))
            ? { Authorization: `Bearer ${configStore.accessCode}` }
            : {}),
        },
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message);
      }

      const title = await res.text();
      updateChatTitle(chat.id, title);
    } catch (err) {
      /* empty */
    }
  };

  const handleSummaryChat = async (lastMessage: IChatMessage) => {
    const chat = getChatById(id);

    let startIndex = 0;

    if (!isNil(chat.contextSummaryMessageId)) {
      const messageIndex = findIndex(chat.messages, {
        id: chat.contextSummaryMessageId,
      });

      if (messageIndex !== -1) {
        startIndex = messageIndex;
      }
    }

    const filteredMessages = _(chat.messages)
      .slice(startIndex)
      .filter((message) =>
        includes(['system', 'assistant', 'user'], message.role),
      )
      .value();

    const numOfMessages = _(filteredMessages)
      .map((m) => m.content.length)
      .sum();

    if (numOfMessages < configStore.messageCompressionThreshold) {
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          openAIKey: emptyToUndefined(configStore.openAIKey),
          openAIEndpoint: emptyToUndefined(configStore.openAIEndpoint),
          messages: [
            ...filteredMessages,
            {
              role: 'user',
              content: `Summarize the discussion briefly in 200 words or less to use as a clue for context later.`,
            },
          ],
          streaming: false,
        }),
        headers: {
          ...(!isNil(emptyToUndefined(configStore.accessCode))
            ? { Authorization: `Bearer ${configStore.accessCode}` }
            : {}),
        },
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message);
      }

      const content = await res.text();
      updateChatSummary(chat.id, content, lastMessage.id);
    } catch (err) {
      /* empty */
    }
  };

  const {
    isLoading,
    input,
    setInput,
    messages,
    setMessages,
    handleInputChange: onInputChange,
    handleSubmit: onSubmit,
    stop,
    reload,
    error,
  } = useChat({
    id: currentChat.id,
    initialInput: currentChat.input,
    initialMessages: currentChat.messages,
    summaryContext: currentChat.contextSummary,
    summaryContextMessageId: currentChat.contextSummaryMessageId,
    body: {
      openAIKey: emptyToUndefined(configStore.openAIKey),
      openAIEndpoint: emptyToUndefined(configStore.openAIEndpoint),
      ...currentChat.settings,
      ...(!isNil(currentChat.attachments)
        ? {
            attachments: map(currentChat.attachments, (blob) =>
              pick(blob, ['pathname', 'url', 'contentType']),
            ),
          }
        : {}),
      streaming: true,
    },
    headers: {
      ...(!isNil(emptyToUndefined(configStore.accessCode))
        ? { Authorization: `Bearer ${configStore.accessCode}` }
        : {}),
    },
    onFinish: async (lastMessage) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });

      handleGenerateTitle();
      handleSummaryChat(lastMessage);
    },
  });

  const cleanedMessages = useMemo(
    () =>
      _(currentChat.messages)
        .filter((message) =>
          includes(['system', 'assistant', 'user'], message.role),
        )
        .orderBy((message) => moment(message.createdAt).valueOf(), 'desc')
        .value(),
    [currentChat.messages],
  );

  const filledMessages = useMemo(() => {
    if (!isNil(scrollRef.current)) {
      scrollRef.current.scrollTo(0, 200);
    }

    return _(cleanedMessages)
      .slice(0, endIndex + configStore.paginationSize)
      .value();
  }, [cleanedMessages, configStore.paginationSize, endIndex]);

  useEffect(() => {
    if (!isNil(currentChat.settings.model) || isNil(configStore.defaultModel)) {
      return;
    }

    updateChatSettings(currentChat.id, { model: configStore.defaultModel });
  }, [
    configStore.defaultModel,
    currentChat.id,
    currentChat.settings.model,
    updateChatSettings,
  ]);

  useEffect(() => {
    syncMessages(currentChat.id, messages);
  }, [currentChat.id, messages, syncMessages]);

  useChatScrollAnchor([cleanedMessages, input], scrollRef);

  const isShowPrompt = useMemo(() => {
    if (isEmpty(promptStore.prompts)) {
      return false;
    }

    return isEqual(input, '/') || isShowToolbarPrompt;
  }, [input, isShowToolbarPrompt, promptStore.prompts]);

  const isEnableChatConfig = useMemo(
    () => isEmpty(cleanedMessages),
    [cleanedMessages],
  );

  const getEmojiFromRole = (role: IChatMessage['role']) => {
    if (role === 'system') {
      return '🔏';
    }

    if (role === 'assistant') {
      return '🤖';
    }

    if (role === 'user') {
      return configStore.emoji;
    }

    if (!isNil(currentChat.mask)) {
      return currentChat.mask.emoji;
    }

    return '🧑‍💻';
  };

  const handleScroll = (ev: HTMLDivElement) => {
    if (ev.scrollTop !== 0) {
      return;
    }

    const lastIndex = lastIndexOf(filledMessages, last(filledMessages));
    if (lastIndex >= cleanedMessages.length - 1) {
      return;
    }

    setEndIndex(lastIndex);
  };

  const handleChoosePrompt = (prompt: IPrompt) => {
    setIsShowToolbarPrompt(false);

    setInput(prompt.content);
  };

  const handlePluginChange = (targetPlugin: ChatPlugin, value: boolean) => {
    const { plugins } = currentChat.settings;

    updateChatSettings(currentChat.id, {
      plugins: value
        ? [...plugins, targetPlugin]
        : filter(plugins, (plugin) => plugin !== targetPlugin),
    });
  };

  const handleClearHistory = () => {
    const newMessages = filter(
      messages,
      (message) => message.role === 'system',
    );
    setMessages(newMessages);
  };

  const handleChangeMessage = (message: IChatMessage, newContent: string) => {
    const newMessages = cloneDeep(messages);

    const targetMessage = newMessages.find((msg) => msg.id === message.id);

    if (targetMessage) {
      targetMessage.content = newContent;
    }

    setMessages(newMessages);
  };

  const handleRegenerateMessage = async (message: IChatMessage) => {
    const newMessages = takeWhile(
      cloneDeep(messages),
      (msg) => msg.id !== message.id,
    );

    if (message.role === 'user') {
      newMessages.push(message);
    }

    setMessages(newMessages);

    await reload();
  };

  const handleRemoveMessage = (message: IChatMessage) => {
    const newMessages = filter(messages, (msg) => msg.id !== message.id);
    setMessages(newMessages);
  };

  const handleInputChange = (ev: ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(ev);

    updateChatInput(currentChat.id, ev.currentTarget.value);
  };

  const handleSubmit = (ev: ChangeEvent<HTMLFormElement>) => {
    onSubmit(ev);

    updateChatInput(currentChat.id);
  };

  const handleRemoveFile = (file: PutBlobResult) => {
    fetch('/api/upload', {
      method: 'DELETE',
      body: JSON.stringify({ url: file.url }),
    });

    const newAttachments = filter(
      currentChat.attachments,
      (attachment) => !isEqual(attachment, file),
    );
    updateChatAttachments(currentChat.id, newAttachments);
  };

  return (
    <div
      ref={scrollRef}
      className="flex flex-1 flex-col overflow-y-auto scrollbar scrollbar-thumb-accent-foreground/30 scrollbar-thumb-rounded-full scrollbar-w-[3px]"
      onScrollCapture={(ev) => handleScroll(ev.currentTarget)}
    >
      <AppBar
        title={currentChat.title}
        subtitle={`${cleanedMessages.length} messages`}
        actions={
          <>
            <EditChatNameButton
              key={1}
              value={currentChat.title}
              onChange={(newTitle) => updateChatTitle(currentChat.id, newTitle)}
            />
            {breakpoint !== 'tablet' && (
              <AppBarIconButton
                key={2}
                IconComponent={
                  configStore.isMaximized
                    ? RiFullscreenExitLine
                    : RiFullscreenLine
                }
                onClick={() => {
                  configStore.updateConfig({
                    isMaximized: !configStore.isMaximized,
                  });
                }}
              />
            )}
          </>
        }
      />
      <div className="flex flex-1 flex-col-reverse gap-5 p-4">
        {configStore.sendPreviewBubble &&
          !isEmpty(input) &&
          !isEqual(input, '/') && (
            <ChatBubble
              emoji={configStore.emoji}
              message={{
                id: uuid(),
                role: 'user',
                content: input,
                createdAt: moment().toDate(),
              }}
            />
          )}
        {error && (
          <ChatBubble
            emoji={getEmojiFromRole('assistant')}
            message={{
              id: uuid(),
              role: 'assistant',
              content: error.message,
              createdAt: moment().toDate(),
            }}
          />
        )}
        {filledMessages.map((message) => (
          <ChatBubble
            key={message.id}
            emoji={getEmojiFromRole(message.role)}
            message={message}
            isTyping={
              isLoading &&
              message.role === 'assistant' &&
              last(filledMessages)!.id === message.id
            }
            onChange={(newContent) => handleChangeMessage(message, newContent)}
            onRegenerate={() => handleRegenerateMessage(message)}
            onRemove={() => handleRemoveMessage(message)}
          />
        ))}
      </div>
      <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background/60 px-4 py-3 backdrop-blur">
        {!isNil(currentChat.attachments) && (
          <div className="flex gap-2 overflow-x-auto">
            {currentChat.attachments.map((file, i) => (
              <div
                key={`${file.pathname}_${i.toString()}`}
                className="flex  items-center gap-2 rounded-lg border px-3 py-2 pr-2"
              >
                <Link
                  href={file.url}
                  className="max-w-[250px] select-text truncate"
                  target="_blank"
                >
                  {truncate(file.pathname, 40)}
                </Link>
                <button type="button" onClick={() => handleRemoveFile(file)}>
                  <RiCloseCircleLine size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        {isShowPrompt && (
          <FadeIn className="flex max-h-[20vh] flex-col divide-y overflow-y-auto overscroll-contain rounded-lg border bg-background text-xs scrollbar scrollbar-thumb-accent-foreground/30 scrollbar-thumb-rounded-full scrollbar-w-[3px]">
            {promptStore.prompts.map((prompt) => (
              <div
                key={prompt.id}
                className="flex cursor-pointer flex-col gap-0.5 px-2.5 py-2 transition-colors hover:bg-accent"
                onClickCapture={() => handleChoosePrompt(prompt)}
              >
                <div className="font-medium">{prompt.title}</div>
                <div className="truncate">{prompt.content}</div>
              </div>
            ))}
          </FadeIn>
        )}
        <div className="flex gap-1.5 overflow-x-hidden">
          <ToolbarIconButton
            IconComponent={RiMagicLine}
            label="Prompts"
            onClick={() => setIsShowToolbarPrompt()}
          />
          <Popover>
            <PopoverTrigger asChild>
              <div className="z-10">
                <ToolbarIconButton
                  IconComponent={RiPlug2Line}
                  label="Plugins"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" className="divide-y p-0">
              <ToolbarPluginItem
                title="Search Engine"
                subtitle="Search the web for information."
                values={currentChat.settings.plugins}
                plugin={ChatPlugin.Search}
                onCheckedChange={handlePluginChange}
              />
              <ToolbarPluginItem
                title="Wikipedia"
                subtitle="Search Wikipedia for information."
                values={currentChat.settings.plugins}
                plugin={ChatPlugin.Wikipedia}
                onCheckedChange={handlePluginChange}
              />
              <ToolbarPluginItem
                title="Web Reader"
                subtitle="Read the content of a website."
                values={currentChat.settings.plugins}
                plugin={ChatPlugin.WebReader}
                onCheckedChange={handlePluginChange}
              />
              <ToolbarPluginItem
                title="PDF Reader"
                subtitle="Read the content of a PDF file from one or more public URLs"
                values={currentChat.settings.plugins}
                plugin={ChatPlugin.PDFReader}
                onCheckedChange={handlePluginChange}
              />
            </PopoverContent>
          </Popover>
          <Dialog>
            <DialogTrigger asChild>
              <div className="z-10">
                <ToolbarIconButton
                  IconComponent={RiSettings4Line}
                  label="Settings"
                />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                  Customize the settings for this chat.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <ToolbarSettingItem title="Model">
                  {isEnableChatConfig ? (
                    <Select
                      dir="ltr"
                      value={currentChat.settings.model}
                      disabled={isEmpty(configStore.models)}
                      onValueChange={(model) => {
                        updateChatSettings(currentChat.id, { model });
                      }}
                    >
                      <SelectTrigger className="w-[180px] truncate">
                        <SelectValue placeholder="Choose a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {configStore.models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={currentChat.settings.model}
                      spellCheck={false}
                      disabled
                    />
                  )}
                </ToolbarSettingItem>
                <ToolbarSettingItem
                  title="Max Token"
                  tooltip="The maximum number of tokens to return."
                >
                  <Input
                    type="number"
                    placeholder="500"
                    className="w-[120px] text-center"
                    value={currentChat.settings.maxTokens}
                    min={500}
                    max={4096}
                    autoComplete="off"
                    disabled={!isEnableChatConfig}
                    onChange={(ev) => {
                      updateChatSettings(currentChat.id, {
                        maxTokens: Number(ev.currentTarget.value) || 0,
                      });
                    }}
                  />
                </ToolbarSettingItem>
                <ToolbarSettingItem
                  title="Temperature"
                  tooltip="Controls the randomness of the returned text; lower is less random."
                >
                  <SliderInput
                    value={[currentChat.settings.temperature]}
                    min={0.1}
                    max={1}
                    step={0.1}
                    disabled={!isEnableChatConfig}
                    onValueChange={(values) => {
                      updateChatSettings(currentChat.id, {
                        temperature: values[0] || 0,
                      });
                    }}
                  />
                </ToolbarSettingItem>
                <ToolbarSettingItem
                  title="Top P"
                  tooltip="The cumulative probability of the most likely tokens to return."
                >
                  <SliderInput
                    value={[currentChat.settings.topP]}
                    min={0.1}
                    max={1}
                    step={0.1}
                    disabled={!isEnableChatConfig}
                    onValueChange={(values) => {
                      updateChatSettings(currentChat.id, {
                        topP: values[0] || 0,
                      });
                    }}
                  />
                </ToolbarSettingItem>
                <ToolbarSettingItem
                  title="Frequency Penalty"
                  tooltip="How much to penalize tokens based on their frequency in the text so far."
                >
                  <SliderInput
                    value={[currentChat.settings.frequencyPenalty]}
                    min={0}
                    max={1}
                    step={0.1}
                    disabled={!isEnableChatConfig}
                    onValueChange={(values) => {
                      updateChatSettings(currentChat.id, {
                        frequencyPenalty: values[0] || 0,
                      });
                    }}
                  />
                </ToolbarSettingItem>
                <ToolbarSettingItem
                  title="Presence Penalty"
                  tooltip="How much to penalize tokens based on if they have appeared in the text so far."
                >
                  <SliderInput
                    value={[currentChat.settings.presencePenalty]}
                    min={0}
                    max={1}
                    step={0.1}
                    disabled={!isEnableChatConfig}
                    onValueChange={(values) => {
                      updateChatSettings(currentChat.id, {
                        presencePenalty: values[0] || 0,
                      });
                    }}
                  />
                </ToolbarSettingItem>
              </div>
            </DialogContent>
          </Dialog>
          <ToolbarIconButton
            IconComponent={VscClearAll}
            label="Clear history"
            className="ml-auto"
            onClick={handleClearHistory}
          />
        </div>
        <form ref={formRef} className="relative" onSubmit={handleSubmit}>
          <TextareaAutosize
            value={input}
            placeholder="Type a message..."
            className="block w-full resize-none overscroll-contain rounded-lg border bg-background px-3 py-2.5 pr-[140px] outline-none scrollbar scrollbar-thumb-accent-foreground/30 scrollbar-thumb-rounded-full scrollbar-w-[3px] placeholder:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            spellCheck={false}
            minRows={4}
            maxRows={6}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            {includes(currentChat.settings.plugins, ChatPlugin.PDFReader) && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleFilePicker}
                disabled={
                  isUploading || (currentChat.attachments || []).length >= 3
                }
              >
                {isUploading ? (
                  <RiLoader3Line size={18} className="animate-spin" />
                ) : (
                  <VscFilePdf size={18} />
                )}
              </Button>
            )}
            {isLoading ? (
              <Button type="submit" variant="outline" onClick={() => stop()}>
                <RiLoader3Line size={18} className="animate-spin" />
                <span className="ml-2">Stop generating</span>
              </Button>
            ) : (
              <Button type="submit">
                <span className="mr-2">Send</span>
                <RiSendPlane2Line size={14} />
              </Button>
            )}
          </div>
        </form>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  );
};

export { ChatWindow };
