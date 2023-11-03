'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import numeral from 'numeral';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/helpers';

const Slider = forwardRef<
  ElementRef<typeof SliderPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full flex-1 overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary/30" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-2 w-4 cursor-pointer rounded-full bg-primary transition-transform data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:scale-125 focus-visible:outline-none" />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';

const SliderInput = forwardRef<
  ElementRef<typeof SliderPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ value, disabled, ...props }, ref) => (
  <div
    className={cn(
      'flex w-[180px] items-center rounded-lg border border-input px-3 py-2',
      disabled && 'opacity-50 pointer-events-none',
    )}
  >
    <span className="mr-3 w-10 text-center">
      {numeral(value || 0).format('0.0')}
    </span>
    <Slider {...props} value={value} ref={ref} />
  </div>
));
SliderInput.displayName = 'SliderInput';

export { Slider, SliderInput };
