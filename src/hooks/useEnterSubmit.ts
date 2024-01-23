import { isNil } from 'lodash';
import type { KeyboardEvent, RefObject } from 'react';
import { useRef } from 'react';

import { SendKeys } from '@/types';

const useEnterSubmit = (
  sendKey: SendKeys,
): {
  formRef: RefObject<HTMLFormElement>;
  onKeyDown: (ev: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>) => void;
} => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (
    ev: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>,
  ) => {
    const { isComposing } = ev.nativeEvent;

    const isEnter = ev.key === 'Enter' && !ev.shiftKey && !isComposing;
    const isCtrlEnter = ev.key === 'Enter' && ev.ctrlKey && !isComposing;

    if (
      (sendKey === SendKeys.Enter && isEnter) ||
      (sendKey === SendKeys.CtrlEnter && isCtrlEnter)
    ) {
      if (isNil(formRef.current)) {
        return;
      }

      formRef.current.requestSubmit();

      ev.preventDefault();
    }
  };

  return { formRef, onKeyDown: handleKeyDown };
};

export { useEnterSubmit };
