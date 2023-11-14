import { isNil, round } from 'lodash';
import type { DependencyList } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useUpdateEffect } from 'react-use';

const useChatScrollAnchor = (deps: DependencyList) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isBottom, setIsBottom] = useState<boolean>(true);

  const checkUserScrollDirection = () => {
    const element = scrollRef.current;

    if (isNil(element)) {
      return;
    }

    const { scrollTop, clientHeight, scrollHeight } = element;
    const isAtBottom = round(scrollTop + clientHeight, 0) >= scrollHeight;

    setIsBottom(isAtBottom);
  };

  const scrollToBottom = () => {
    const element = scrollRef.current;

    if (isNil(element)) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight });
  };

  useEffect(() => {
    const element = scrollRef.current;

    if (!isNil(element)) {
      element.addEventListener('scroll', checkUserScrollDirection);
    }

    return () => {
      if (!isNil(element)) {
        element.removeEventListener('scroll', checkUserScrollDirection);
      }
    };
  }, [scrollRef]);

  useUpdateEffect(() => {
    if (!isBottom) {
      return;
    }

    scrollToBottom();
  }, [scrollRef, ...deps]);

  return { scrollRef, isBottom, scrollToBottom };
};

export { useChatScrollAnchor };
