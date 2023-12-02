import type { ClassValue } from 'clsx';
import clsx from 'clsx';
import _, { isEmpty, isNil, startsWith } from 'lodash';
import type { NextRequest } from 'next/server';
import { twMerge } from 'tailwind-merge';
import { v4 as uuid } from 'uuid';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const emptyToUndefined = <T>(value?: T): T | undefined =>
  isEmpty(value) ? undefined : value;

const auth = async (nreq: NextRequest): Promise<boolean> => {
  const req = nreq.clone();

  const authorization = req.headers.get('Authorization');
  const accessCode = _(authorization).split('Bearer ').last() || '';

  const isValid = _(process.env.IDEX_ACCESS_CODES || '')
    .split(',')
    .filter((s) => !isEmpty(s))
    .includes(accessCode);

  if (!isValid) {
    const { openAIKey } = await req.json();

    return !isNil(openAIKey) && startsWith(openAIKey, 'sk-');
  }

  return isValid;
};

const truncate = (str: string, maxLength: number): string => {
  if (!str || maxLength < 1 || str.length <= maxLength) {
    return str;
  }

  if (maxLength === 1) {
    return `${str.charAt(0)}...`;
  }

  const midpoint = Math.floor(str.length / 2);
  const charsToRemove = str.length - maxLength - 3;
  const leftRemove = Math.ceil(charsToRemove / 2);
  const rightRemove = charsToRemove - leftRemove;

  const leftStr = str.slice(0, midpoint - leftRemove);
  const rightStr = str.slice(midpoint + rightRemove);

  return `${leftStr}...${rightStr}`;
};

const isJSON = (str: string): boolean => {
  try {
    JSON.parse(str);

    return true;
  } catch (err) {
    return false;
  }
};

const isTrue = (str?: string): boolean => str === 'true' || str === '1';

const getModelNameByModelID = (id: string): string => {
  switch (id) {
    case 'gpt-4':
      return 'GPT-4';
    case 'gpt-4-0314':
      return 'GPT-4 (0314)';
    case 'gpt-4-0613':
      return 'GPT-4 (0613)';
    case 'gpt-3.5-turbo-0613':
      return 'GPT-3.5 Turbo (0613)';
    case 'gpt-3.5-turbo-16k-0613':
      return 'GPT-3.5 Turbo (0613, 16k)';
    case 'gpt-3.5-turbo-0301':
      return 'GPT-3.5 Turbo (0301)';
    case 'gpt-3.5-turbo':
      return 'GPT-3.5 Turbo';
    default:
      return id.toUpperCase();
  }
};

const tokenizer = (text: string): number => {
  let length = 0;

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);

    if (charCode < 128) {
      if (charCode <= 122 && charCode >= 65) {
        length += 0.25;
      } else {
        length += 0.5;
      }
    } else {
      length += 1.5;
    }
  }

  return length;
};

export {
  auth,
  cn,
  emptyToUndefined,
  getModelNameByModelID,
  isJSON,
  isTrue,
  tokenizer,
  truncate,
  uuid,
};
