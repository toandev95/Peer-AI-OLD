/* eslint-disable react/no-unstable-nested-components */

'use client';

import _, { isEmpty, isNil } from 'lodash';
import moment from 'moment';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { IoTrashOutline } from 'react-icons/io5';
import {
  RiCheckLine,
  RiClipboardLine,
  RiEdit2Line,
  RiRefreshLine,
} from 'react-icons/ri';
import { TiPin, TiPinOutline } from 'react-icons/ti';
import { BeatLoader } from 'react-spinners';
import TextareaAutosize from 'react-textarea-autosize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { useCopyToClipboard } from '@/hooks';
import { cn, truncate } from '@/lib/helpers';
import type { IAgentAction, IChatMessage } from '@/types';

import { MemoizedReactMarkdown } from './Markdown';
import { Button } from './UI/Button';
import { CodeBlock } from './UI/CodeBlock';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './UI/Dialog';
import { FadeIn } from './UI/FadeIn';

const ChatBubbleButton = ({
  IconComponent,
  size = 14,
  className,
  onClick,
}: {
  IconComponent: IconType;
  size?: number;
  className?: string;
  onClick?: () => void;
}) => (
  <Button
    variant="outline"
    size="icon"
    className={cn('h-6 w-8 text-muted-foreground shadow-none', className)}
    onClick={onClick}
  >
    <IconComponent size={size} />
  </Button>
);

const EditChatMessageButton = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (newContent: string) => void;
}) => {
  const { t } = useTranslation();

  const [open, setOpen] = useState<boolean>(false);
  const [newContent, setNewContent] = useState<string>(value);

  const handleSubmit = (ev: ChangeEvent<HTMLFormElement>) => {
    ev.preventDefault();

    onChange(newContent);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
          <ChatBubbleButton IconComponent={RiEdit2Line} />
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('chatWindow.editMessageContent.title')}</DialogTitle>
          <DialogDescription>
            {t('chatWindow.editMessageContent.subtitle')}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col items-end gap-4" onSubmit={handleSubmit}>
          <TextareaAutosize
            defaultValue={newContent}
            placeholder={t('chatWindow.editMessageContent.placeholder')}
            className="block w-full resize-none overscroll-contain rounded-lg border bg-background px-3 py-2.5 outline-none scrollbar scrollbar-thumb-accent-foreground/30 scrollbar-thumb-rounded-full scrollbar-w-[3px] placeholder:text-foreground"
            spellCheck={false}
            minRows={3}
            maxRows={6}
            onChange={(ev) => setNewContent(ev.currentTarget.value.trim())}
          />
          <Button
            type="submit"
            disabled={isEmpty(newContent)}
            onClick={() => onChange(newContent)}
          >
            {t('chatWindow.editMessageContent.save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ChatBubble = ({
  emoji,
  message,
  // isTyping,
  onChange,
  onRegenerate,
  onRemove,
  onPin,
}: {
  emoji: string;
  message: IChatMessage;
  isTyping?: boolean;
  onChange?: (newContent: string) => void;
  onRegenerate?: () => void;
  onRemove?: () => void;
  onPin?: () => void;
}) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const getToolName = (tool: IAgentAction['tool']) => {
    switch (tool) {
      case 'wikipedia-api':
        return '📚 Wikipedia';

      case 'calculator':
        return '🧮 Calculator';

      case 'search':
        return '🔍 Search';

      case 'dall-e':
        return '🌄 DALL·E 3';

      case 'web-browser':
        return '🌐 Web Browser';

      default:
        return tool;
    }
  };

  const getToolInput = (
    tool: IAgentAction['tool'],
    toolInput: IAgentAction['toolInput'],
  ) => {
    switch (tool) {
      case 'search':
        return (toolInput.query as string).trim();

      case 'web-browser':
        return `${toolInput.task} → ${truncate(toolInput.url, 30)}`;

      default:
        return !isNil(toolInput.input) && !isEmpty(toolInput.input)
          ? (toolInput.input as string).trim()
          : null;
    }
  };

  return (
    <FadeIn
      className={cn(
        'group flex-col flex',
        message.role === 'user' ? 'items-end' : 'items-start',
      )}
    >
      <div
        className={cn(
          'mb-1.5 flex items-end gap-2',
          message.role === 'user' && 'flex-row-reverse',
        )}
      >
        <div className="rounded-lg border bg-background px-1.5 py-0.5">
          {emoji}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!isNil(onChange) && message.role === 'user' && (
            <EditChatMessageButton
              value={message.content}
              onChange={onChange}
            />
          )}
          {!isNil(onRegenerate) && message.role !== 'system' && (
            <ChatBubbleButton
              IconComponent={RiRefreshLine}
              onClick={onRegenerate}
            />
          )}
          {!isNil(onPin) && message.role !== 'system' && (
            <ChatBubbleButton
              IconComponent={message.isPinned ? TiPin : TiPinOutline}
              className={cn(
                message.isPinned && 'text-primary hover:text-primary',
              )}
              onClick={onPin}
            />
          )}
          <ChatBubbleButton
            IconComponent={isCopied ? RiCheckLine : RiClipboardLine}
            size={14}
            onClick={() => copyToClipboard(message.content)}
          />
          {!isNil(onRemove) && message.role !== 'system' && (
            <ChatBubbleButton
              IconComponent={IoTrashOutline}
              onClick={onRemove}
            />
          )}
        </div>
      </div>
      {!isNil(message.tools) && !isEmpty(message.tools) && (
        <div className="mb-2 flex max-w-[50%] flex-col gap-1.5">
          {_(message.tools)
            .map(({ tool, toolInput }, i) => (
              <div
                key={`${tool}_${i.toString()}`}
                className="w-full truncate text-xs text-muted-foreground"
              >
                {!isNil(getToolInput(tool, toolInput)) ? (
                  <>
                    <span className="font-medium">{getToolName(tool)}</span>:{' '}
                    {getToolInput(tool, toolInput)}
                  </>
                ) : (
                  <span className="font-medium">{getToolName(tool)}</span>
                )}
              </div>
            ))
            .value()}
        </div>
      )}
      <div className="max-w-[75%]">
        <div
          className={cn(
            'rounded-lg bg-background px-3 py-2.5 shadow border border-transparent dark:border-inherit transition-colors',
            message.role === 'user' && 'bg-primary/[.08] dark:bg-primary/5',
            message.isPinned && 'border-primary/60 dark:border-primary/60',
          )}
        >
          {message.role === 'assistant' && isEmpty(message.content) && (
            <BeatLoader color="#3c83f6" size={6} />
          )}
          {!isEmpty(message.content) && (
            <MemoizedReactMarkdown
              className={cn(
                'prose prose-sm select-text break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-img:my-0',
                // message.role === 'assistant' && isTyping && 'typing',
              )}
              remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
              components={{
                p: ({ children }) => {
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
                a: ({ children, ...props }) => {
                  return (
                    <a {...props} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                },
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');

                  return !isNil(match) ? (
                    <CodeBlock
                      language={match[1]!}
                      value={String(children).replace(/\n$/, '')}
                    />
                  ) : (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </MemoizedReactMarkdown>
          )}
        </div>
      </div>
      {message.createdAt && (
        <div className="mt-1 text-xs text-muted-foreground">
          {moment(message.createdAt).format('lll')}
        </div>
      )}
    </FadeIn>
  );
};

export { ChatBubble };
