/* eslint-disable react/no-unstable-nested-components */

'use client';

import { isEmpty, isNil } from 'lodash';
import moment from 'moment';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { IconType } from 'react-icons';
import { IoTrashOutline } from 'react-icons/io5';
import {
  RiCheckLine,
  RiClipboardLine,
  RiEdit2Line,
  RiRefreshLine,
} from 'react-icons/ri';
import { BeatLoader } from 'react-spinners';
import TextareaAutosize from 'react-textarea-autosize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { useCopyToClipboard } from '@/hooks';
import { cn } from '@/lib/helpers';
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
  onClick,
}: {
  IconComponent: IconType;
  size?: number;
  onClick?: () => void;
}) => (
  <Button
    variant="outline"
    size="icon"
    className="h-6 w-8 text-muted-foreground shadow-none"
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
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Edit the content of the sent message.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col items-end gap-4" onSubmit={handleSubmit}>
          <TextareaAutosize
            defaultValue={newContent}
            placeholder="Conversation name"
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
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ChatBubble = ({
  emoji,
  message,
  onChange,
  onRegenerate,
  onRemove,
}: {
  emoji: string;
  message: IChatMessage;
  isTyping?: boolean;
  onChange?: (newContent: string) => void;
  onRegenerate?: () => void;
  onRemove?: () => void;
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

      case 'pdf':
        return '📃 PDF Reader';

      case 'dall-e':
        return '🌄 DALL·E 3';

      case 'requests_get':
        return '🛜 Web Render (GET)';

      case 'requests_post':
        return '🛜 Web Render (POST)';

      default:
        return tool;
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
          {/* <ChatBubbleButton IconComponent={TiPinOutline} onClick={() => {}} /> */}
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
          {message.tools.map(({ tool, toolInput }, i) => (
            <div
              key={`${tool}_${i.toString()}`}
              className="w-full truncate text-xs text-muted-foreground"
            >
              {!isEmpty(toolInput.input) ? (
                <>
                  <span className="font-medium">{getToolName(tool)}</span>:{' '}
                  {toolInput.input}
                </>
              ) : (
                <span className="font-medium">{getToolName(tool)}</span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="max-w-[75%]">
        <div
          className={cn(
            'rounded-lg bg-background px-3 py-2.5 shadow border border-transparent dark:border-inherit',
            message.role === 'user' && 'bg-primary/[.08] dark:bg-primary/5',
          )}
        >
          {message.role === 'assistant' && isEmpty(message.content) && (
            <BeatLoader color="#3c83f6" size={6} />
          )}
          {!isEmpty(message.content) && (
            <MemoizedReactMarkdown
              className="prose prose-sm select-text break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-img:my-0"
              remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                code: ({ inline, className, children, ...props }) => {
                  if (children.length > 0) {
                    if (children[0] === '▍') {
                      return (
                        <span className="mt-1 animate-pulse cursor-default">
                          ▍
                        </span>
                      );
                    }

                    // eslint-disable-next-line no-param-reassign
                    children[0] = (children[0] as string).replace('`▍`', '▍');
                  }

                  if (inline) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }

                  const match = /language-(\w+)/.exec(className || '');

                  return (
                    <CodeBlock
                      language={(match && match[1]) || ''}
                      value={String(children).replace(/\n$/, '')}
                    />
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
