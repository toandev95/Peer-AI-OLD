'use client';

import emojiData from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@radix-ui/react-popover';
import { isEmpty, isNil, map, toNumber, valuesIn } from 'lodash';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiCloseLine } from 'react-icons/ri';

import i18n, { supportedLanguages } from '@/i18n';
import {
  useChatStore,
  useConfigStore,
  useMaskStore,
  usePromptStore,
} from '@/stores';
import { SendKeys } from '@/types';

import { AppBar, AppBarIconButton } from './AppBar';
import { useConfirmDialog } from './Providers/ConfirmDialogProvider';
import { Button } from './UI/Button';
import { Card } from './UI/Card';
import { ConfirmDialog } from './UI/ConfirmDialog';
import { FadeIn } from './UI/FadeIn';
import { DebouncedInput, Input } from './UI/Input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './UI/Select';
import { SliderInput } from './UI/Slider';
import { Switch } from './UI/Switch';

const BoxItem = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-3">
    <div className="flex flex-1 flex-col gap-0.5">
      <div className="font-medium">{title}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
    <div className="flex shrink-0">{children}</div>
  </div>
);

const EmojiPickerButton = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const { theme, systemTheme } = useTheme();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="z-10">
          <Button variant="outline" size="icon" className="text-xl shadow-none">
            {value}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="z-20">
        <Picker
          theme={theme || systemTheme}
          data={emojiData}
          onEmojiSelect={(data: { native: string }) => {
            onChange(data.native);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

const Settings = () => {
  const { t } = useTranslation();

  const confirm = useConfirmDialog(ConfirmDialog);

  const router = useRouter();

  const configStore = useConfigStore();
  const chatStore = useChatStore();
  const maskStore = useMaskStore();
  const promptStore = usePromptStore();

  const updateConfig = useConfigStore((state) => state.updateConfig);

  const handleResetSettings = () => {
    confirm({
      message: 'Are you sure you want to reset all settings to default?',
      onConfirmAction: () => {
        configStore.clear();

        localStorage.removeItem('i18nextLng');
        i18n.changeLanguage();
      },
    });
  };

  const handleDeleteAll = () => {
    confirm({
      message:
        'Are you sure you want to delete all conversations and settings?',
      onConfirmAction: () => {
        configStore.clear();
        chatStore.clear();
        maskStore.clear();
        promptStore.clear();

        localStorage.removeItem('i18nextLng');
        i18n.changeLanguage();
      },
    });
  };

  return (
    <>
      <AppBar
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        actions={
          <AppBarIconButton
            key={1}
            IconComponent={RiCloseLine}
            onClick={() => router.back()}
          />
        }
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <FadeIn>
          <Card>
            <div className="divide-y">
              <BoxItem title="Avatar">
                <EmojiPickerButton
                  value={configStore.emoji}
                  onChange={(value) => {
                    configStore.updateConfig({ emoji: value });
                  }}
                />
              </BoxItem>
              <BoxItem
                title="Language"
                subtitle="The language used for the interface."
              >
                <Select
                  value={i18n.language}
                  onValueChange={(key) => {
                    i18n.changeLanguage(key);
                  }}
                >
                  <SelectTrigger className="w-[180px] truncate">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {map(supportedLanguages, (lng, key) => (
                        <SelectItem key={key} value={key}>
                          {lng}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </BoxItem>
              <BoxItem
                title="Send Key"
                subtitle={
                  configStore.sendKey === SendKeys.Enter
                    ? 'Press Enter to send, hold Shift + Enter to go to the next line.'
                    : 'Press Ctrl (or Command) + Enter to send.'
                }
              >
                <Select
                  value={configStore.sendKey}
                  onValueChange={(key: SendKeys) => {
                    configStore.updateConfig({ sendKey: key });
                  }}
                >
                  <SelectTrigger className="w-[180px] truncate">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {valuesIn(SendKeys).map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </BoxItem>
              <BoxItem
                title="Send Preview Bubble"
                subtitle="Allow previewing the message that will be sent while composing."
              >
                <Switch
                  checked={configStore.sendPreviewBubble}
                  onCheckedChange={(checked) => {
                    configStore.updateConfig({ sendPreviewBubble: checked });
                  }}
                />
              </BoxItem>
            </div>
          </Card>
        </FadeIn>
        <FadeIn>
          <Card>
            <div className="divide-y">
              <BoxItem title="API Key" subtitle="OpenAI API Key for access.">
                <DebouncedInput
                  type="password"
                  placeholder="sk-xxx"
                  className="text-center"
                  value={configStore.openAIKey || ''}
                  autoComplete="off"
                  onDebounceChange={(value) => {
                    if (isNil(value)) {
                      return;
                    }

                    updateConfig({ openAIKey: value.toString().trim() });
                  }}
                />
              </BoxItem>
              <BoxItem title="API Endpoint" subtitle="OpenAI API Endpoint.">
                <DebouncedInput
                  type="url"
                  placeholder="https://api.openai.com/v1"
                  className="text-center"
                  value={configStore.openAIEndpoint || ''}
                  autoComplete="off"
                  onDebounceChange={(value) => {
                    if (isNil(value)) {
                      return;
                    }

                    updateConfig({ openAIEndpoint: value.toString().trim() });
                  }}
                />
              </BoxItem>
              <BoxItem
                title="Access Code"
                subtitle="The access code is authorized to access OpenAI."
              >
                <DebouncedInput
                  type="password"
                  placeholder="xxx"
                  className="text-center"
                  value={configStore.accessCode || ''}
                  autoComplete="off"
                  onDebounceChange={(value) => {
                    if (isNil(value)) {
                      return;
                    }

                    updateConfig({ accessCode: value.toString().trim() });
                  }}
                />
              </BoxItem>
              <BoxItem title="Model">
                <Select
                  value={configStore.defaultModel}
                  disabled={isEmpty(configStore.models)}
                  onValueChange={(model) => {
                    configStore.updateConfig({ defaultModel: model });
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
              </BoxItem>
              <BoxItem
                title="Max Tokens"
                subtitle="The maximum number of tokens to return."
              >
                <Input
                  type="number"
                  className="w-[120px] text-center"
                  value={configStore.maxTokens || 1000}
                  onChange={(ev) => {
                    updateConfig({
                      maxTokens: toNumber(ev.currentTarget.value) || undefined,
                    });
                  }}
                />
              </BoxItem>
              <BoxItem
                title="Temperature"
                subtitle="Controls the randomness of the returned text; lower is less random."
              >
                <SliderInput
                  value={[configStore.temperature]}
                  min={0.1}
                  max={1}
                  step={0.1}
                  onValueChange={(values) => {
                    updateConfig({ temperature: values[0] || 0 });
                  }}
                />
              </BoxItem>
              <BoxItem
                title="Top P"
                subtitle="The cumulative probability of the most likely tokens to return."
              >
                <SliderInput
                  value={[configStore.topP]}
                  min={0.1}
                  max={1}
                  step={0.1}
                  onValueChange={(values) => {
                    updateConfig({ topP: values[0] || 0 });
                  }}
                />
              </BoxItem>
              <BoxItem
                title="Frequency Penalty"
                subtitle="How much to penalize tokens based on their frequency in the text so far."
              >
                <SliderInput
                  value={[configStore.frequencyPenalty]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={(values) => {
                    updateConfig({ frequencyPenalty: values[0] || 0 });
                  }}
                />
              </BoxItem>
              <BoxItem
                title="Presence Penalty"
                subtitle="How much to penalize tokens based on if they have appeared in the text so far."
              >
                <SliderInput
                  value={[configStore.presencePenalty]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={(values) => {
                    updateConfig({ presencePenalty: values[0] || 0 });
                  }}
                />
              </BoxItem>
            </div>
          </Card>
        </FadeIn>
        <FadeIn>
          <Card>
            <div className="divide-y">
              <BoxItem
                title="Compression Threshold"
                subtitle="When this threshold is reached, the conversation content will be summarized to reduce token consumption."
              >
                <Input
                  type="number"
                  className="w-[120px] text-center"
                  value={configStore.messageCompressionThreshold || 2000}
                  onChange={(ev) => {
                    updateConfig({
                      messageCompressionThreshold:
                        toNumber(ev.currentTarget.value) || undefined,
                    });
                  }}
                />
              </BoxItem>
            </div>
          </Card>
        </FadeIn>
        <FadeIn>
          <Card>
            <div className="divide-y">
              <BoxItem title="Reset" subtitle="Reset all settings to default.">
                <Button
                  variant="destructive"
                  className="bg-destructive/20 text-destructive hover:text-destructive-foreground dark:bg-destructive/40 dark:text-destructive-foreground dark:hover:bg-destructive/80"
                  size="sm"
                  onClick={handleResetSettings}
                >
                  Reset
                </Button>
              </BoxItem>
              <BoxItem
                title="Delete All"
                subtitle="Delete all conversations and settings."
              >
                <Button
                  variant="destructive"
                  className="bg-destructive/20 text-destructive hover:text-destructive-foreground dark:bg-destructive/40 dark:text-destructive-foreground dark:hover:bg-destructive/80"
                  size="sm"
                  onClick={handleDeleteAll}
                >
                  Delete
                </Button>
              </BoxItem>
            </div>
          </Card>
        </FadeIn>
      </div>
    </>
  );
};

export { Settings };
