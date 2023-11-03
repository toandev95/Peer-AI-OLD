import { type ClassValue, clsx } from 'clsx';
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

export { auth, cn, emptyToUndefined, isJSON, truncate, uuid };
