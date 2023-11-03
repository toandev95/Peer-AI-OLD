import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { forwardRef, useEffect, useState } from 'react';
import { useDebounce } from 'react-use';

import { cn } from '@/lib/helpers';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

const DebouncedInput = ({
  onDebounceChange,
  value: propValue,
  ...props
}: InputProps & { onDebounceChange: (value: typeof propValue) => void }) => {
  const [value, setValue] = useState(propValue);

  useDebounce(
    () => {
      onDebounceChange(value);
    },
    500,
    [value],
  );

  useEffect(() => {
    setValue(propValue);
  }, [propValue]);

  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
    setValue(ev.currentTarget.value);
  };

  return <Input {...props} value={value} onChange={handleChange} />;
};

export type { InputProps };
export { DebouncedInput, Input };
