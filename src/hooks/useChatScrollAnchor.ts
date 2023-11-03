import { isNil } from 'lodash';
import type { DependencyList, RefObject } from 'react';
import { useUpdateEffect } from 'react-use';

const useChatScrollAnchor = (
  deps: DependencyList,
  ref: RefObject<HTMLDivElement>,
) => {
  useUpdateEffect(() => {
    if (isNil(ref.current)) {
      return;
    }

    ref.current.scrollTo({ top: ref.current.scrollHeight });
  }, [ref, ...deps]);
};

export { useChatScrollAnchor };
