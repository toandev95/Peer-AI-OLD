'use client';

import type { FC } from 'react';
import { memo } from 'react';
import { RiCheckLine, RiClipboardLine } from 'react-icons/ri';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { useCopyToClipboard } from '@/hooks';

const CodeBlock: FC<{ language: string; value: string }> = memo(
  ({ language, value }) => {
    const { isCopied, copyToClipboard } = useCopyToClipboard();

    return (
      <div className="relative text-sm">
        <div className="flex select-none items-center justify-between px-3 py-1.5">
          <span className="text-xs lowercase">{language}</span>
          <button
            type="submit"
            className="p-0.5"
            onClick={() => copyToClipboard(value)}
          >
            {isCopied ? (
              <RiCheckLine size={14} />
            ) : (
              <RiClipboardLine size={14} />
            )}
          </button>
        </div>
        <SyntaxHighlighter
          language={language}
          style={coldarkDark}
          PreTag="div"
          customStyle={{ margin: 0, width: '100%' }}
          showInlineLineNumbers
          showLineNumbers
        >
          {value}
        </SyntaxHighlighter>
      </div>
    );
  },
);
CodeBlock.displayName = 'CodeBlock';

export { CodeBlock };
