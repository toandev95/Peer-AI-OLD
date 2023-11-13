'use client';

import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProvided,
  DropResult,
} from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import _, { includes, isNil } from 'lodash';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RiChat3Line,
  RiCloseCircleLine,
  RiLightbulbFlashLine,
  RiLightbulbLine,
  RiOpenaiFill,
  RiSettings3Line,
} from 'react-icons/ri';

import { cn } from '@/lib/helpers';
import moment from '@/lib/moment';
import { useChatStore, useConfigStore } from '@/stores';
import type { IChat } from '@/types';

import { useConfirmDialog } from './Providers/ConfirmDialogProvider';
import { Button } from './UI/Button';
import { ConfirmDialog } from './UI/ConfirmDialog';

const MenuItem = ({
  chat,
  selected = false,
  onItemClick,
  onRemoveClick,
}: {
  chat: IChat;
  selected?: boolean;
  onItemClick: () => void;
  onRemoveClick: () => void;
}) => {
  const { t } = useTranslation();

  const totalMessages = _(chat.messages)
    .filter((message) => includes(['assistant', 'user'], message.role))
    .size();

  return (
    <div className="group relative">
      <div
        className={cn(
          'rounded-lg px-4 py-3 border bg-background shadow-sm transition-all cursor-pointer group-hover:bg-accent dark:group-hover:bg-accent',
          selected && 'border-primary dark:bg-primary/5',
        )}
        onClickCapture={onItemClick}
      >
        <div className="mb-1 truncate font-medium">{chat.title}</div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t('sidebar.totalMessages', { count: totalMessages })}</span>
          <span>{moment(chat.createdAt).fromNow()}</span>
        </div>
      </div>
      <button
        type="button"
        className="absolute right-1 top-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onRemoveClick}
      >
        <RiCloseCircleLine size={16} />
      </button>
    </div>
  );
};

const Sidebar = () => {
  const { t } = useTranslation();

  const confirm = useConfirmDialog(ConfirmDialog);

  const router = useRouter();
  const { theme, systemTheme, setTheme } = useTheme();

  const chatStore = useChatStore();
  const configStore = useConfigStore();

  const currentChatId = useChatStore((state) => state.currentChatId);
  const updateConfig = useConfigStore((state) => state.updateConfig);

  const ref = useRef<HTMLDivElement>(null);

  const [isResizing, setIsResizing] = useState<boolean>(false);

  const handleResize = useCallback(
    (ev: MouseEvent) => {
      if (isNil(ref.current)) {
        return;
      }

      if (isResizing) {
        const { left } = ref.current.getBoundingClientRect();

        updateConfig({ sidebarWidth: ev.clientX - left });
      }
    },
    [isResizing, updateConfig],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', () => setIsResizing(false));

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', () => setIsResizing(false));
    };
  }, [handleResize]);

  const handleRemoveChat = (id: string) => {
    confirm({
      message: 'Are you sure you want to remove this chat?',
      onConfirmAction: () => {
        chatStore.removeChat(id);

        if (currentChatId === id) {
          router.push('/');
        }
      },
    });
  };

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (isNil(destination)) {
      return;
    }

    const newChats = chatStore.chats;

    const [oldChat] = newChats.splice(source.index, 1);
    newChats.splice(destination.index, 0, oldChat as IChat);

    chatStore.updateChats(newChats);
  };

  const handleToggleTheme = () => {
    setTheme(
      (theme !== 'system' ? theme : systemTheme) === 'light' ? 'dark' : 'light',
    );
  };

  return (
    <div
      ref={ref}
      className="flex border-r bg-primary/[.08] shadow-[inset_-2px_0_2px_0_rgba(0,0,0,.04)] dark:bg-primary/[.02] dark:shadow-none"
      onMouseDownCapture={(e) => e.preventDefault()}
    >
      <div
        className="flex min-w-[270px] max-w-[500px] shrink-0 grow flex-col p-5"
        style={{ width: configStore.sidebarWidth }}
      >
        <div className="group relative py-5">
          <Link href="/" className="mb-0.5 inline-block text-xl font-bold">
            PeerAI
          </Link>
          <div className="opacity-70">{t('sidebar.slogan')}</div>
          <RiOpenaiFill
            size={54}
            className="absolute right-0 top-4 text-primary/10 transition-colors duration-300 group-hover:text-primary/20"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="droppable">
              {(droppableProvided: DroppableProvided) => (
                <div
                  ref={droppableProvided.innerRef}
                  {...droppableProvided.droppableProps}
                  className="flex flex-col"
                >
                  {chatStore.chats.map((chat, i) => (
                    <Draggable key={chat.id} index={i} draggableId={chat.id}>
                      {(
                        draggableProvided: DraggableProvided,
                        snapshot: DraggableStateSnapshot,
                      ) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          {...draggableProvided.dragHandleProps}
                          className={cn(
                            'my-1.5 transition-opacity',
                            snapshot.isDragging && 'opacity-80',
                          )}
                        >
                          <MenuItem
                            chat={chat}
                            selected={currentChatId === chat.id}
                            onItemClick={() => router.push(`/${chat.id}`)}
                            onRemoveClick={() => handleRemoveChat(chat.id)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {droppableProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
        <div className="flex justify-between pt-5">
          <Button variant="outline" onClick={() => router.push('/')}>
            <RiChat3Line size={18} />
            <div className="ml-1.5">{t('sidebar.newChat')}</div>
          </Button>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleToggleTheme()}
            >
              {theme === 'light' ? (
                <RiLightbulbFlashLine size={18} />
              ) : (
                <RiLightbulbLine size={18} />
              )}
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href="/settings">
                <RiSettings3Line size={18} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div
        className="z-10 w-1 cursor-col-resize"
        onMouseDownCapture={() => setIsResizing(true)}
      />
    </div>
  );
};

export { Sidebar };
