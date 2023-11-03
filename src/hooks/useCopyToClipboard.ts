'use client';

import { isEmpty, isNil } from 'lodash';
import { useState } from 'react';

function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState<Boolean>(false);

  const copyToClipboard = (value: string) => {
    if (isNil(typeof window) || isEmpty(value)) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  return { isCopied, copyToClipboard };
}

export { useCopyToClipboard };
