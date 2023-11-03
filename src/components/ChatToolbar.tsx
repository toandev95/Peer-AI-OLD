import { includes } from 'lodash';
import type { ReactNode } from 'react';
import type { IconBaseProps, IconType } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';

import { cn } from '@/lib/helpers';
import type { ChatPlugin } from '@/types';

import type { ButtonProps } from './UI/Button';
import { Button } from './UI/Button';
import { Switch } from './UI/Switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './UI/Tooltip';

const ToolbarIconButton = ({
  IconComponent,
  iconSize = 14,
  label,
  onClick,
  className,
}: ButtonProps & {
  IconComponent: IconType;
  iconSize?: IconBaseProps['size'];
  label: string;
}) => (
  <Button
    variant="outline"
    className={cn('group z-10 h-8 px-3 shadow-none', className)}
    onClick={onClick}
  >
    <IconComponent size={iconSize} />
    <span className="ml-0 block max-w-0 whitespace-nowrap text-xs opacity-0 transition-all group-hover:ml-1 group-hover:max-w-xs group-hover:opacity-100">
      {label}
    </span>
  </Button>
);

const ToolbarPluginItem = ({
  title,
  subtitle,
  values,
  plugin,
  disabled,
  onCheckedChange,
}: {
  title: string;
  subtitle?: string;
  values: ChatPlugin[];
  plugin: ChatPlugin;
  disabled?: boolean;
  onCheckedChange: (plugin: ChatPlugin, value: boolean) => void;
}) => (
  <div className="flex items-center gap-3 px-3.5 py-3">
    <div
      className={cn(
        'flex flex-1 flex-col gap-0.5',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className="font-medium">{title}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
    <Switch
      checked={includes(values, plugin)}
      disabled={disabled}
      onCheckedChange={(checked) => onCheckedChange(plugin, checked)}
    />
  </div>
);

const ToolbarSettingItem = ({
  title,
  subtitle,
  tooltip,
  children,
}: {
  title: string;
  subtitle?: string;
  tooltip?: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex flex-1 flex-col gap-0.5">
      <div className="flex items-center">
        <span className="font-medium">{title}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-1 cursor-pointer">
                <RiInformationLine size={14} />
              </div>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
    <div className="flex shrink-0">{children}</div>
  </div>
);

export { ToolbarIconButton, ToolbarPluginItem, ToolbarSettingItem };
