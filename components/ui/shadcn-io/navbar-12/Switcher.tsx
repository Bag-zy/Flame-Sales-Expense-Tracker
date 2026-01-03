'use client';

import * as React from 'react';
import { ChevronsUpDown, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export interface SwitcherItem {
  value: string;
  label: string;
}

export interface SwitcherProps {
  items: SwitcherItem[];
  value: string;
  onChange: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  emptyText?: string;
  widthClassName?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

 export interface MultiSwitcherProps {
   items: SwitcherItem[];
   values: string[];
   onChange: (values: string[]) => void;
   actionLabel?: string;
   onAction?: () => void;
   placeholder?: string;
   searchPlaceholder?: string;
   onSearchChange?: (query: string) => void;
   emptyText?: string;
   widthClassName?: string;
   disabled?: boolean;
 }

export const Switcher = React.forwardRef<HTMLButtonElement, SwitcherProps>(
  (
    {
      items,
      value,
      onChange,
      actionLabel,
      onAction,
      placeholder = 'Select...',
      searchPlaceholder = 'Search...',
      onSearchChange,
      emptyText = 'No results found.',
      widthClassName = 'w-[200px]',
      disabled,
      allowClear = true,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const currentLabel = React.useMemo(() => {
      return items.find((i) => i.value === value)?.label;
    }, [items, value]);

    const handleSelect = (nextValue: string) => {
      const finalValue = allowClear && nextValue === value ? '' : nextValue;
      onChange(finalValue);
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(widthClassName, 'justify-between')}
            disabled={disabled}
          >
            {currentLabel || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn(widthClassName, 'p-0')}>
          <Command>
            <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {actionLabel && onAction ? (
                  <CommandItem
                    value={actionLabel}
                    onSelect={() => {
                      onAction();
                      setOpen(false);
                    }}
                  >
                    {actionLabel}
                  </CommandItem>
                ) : null}
                {items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.label}
                    onSelect={() => handleSelect(item.value)}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === item.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

Switcher.displayName = 'Switcher';

 export const MultiSwitcher = React.forwardRef<HTMLButtonElement, MultiSwitcherProps>(
   (
     {
       items,
       values,
       onChange,
       actionLabel,
       onAction,
       placeholder = 'Select...',
       searchPlaceholder = 'Search...',
       onSearchChange,
       emptyText = 'No results found.',
       widthClassName = 'w-[200px]',
       disabled,
     },
     ref,
   ) => {
     const [open, setOpen] = React.useState(false);

     const selectedLabels = React.useMemo(() => {
       if (!values?.length) return [];
       const selected = new Set(values);
       return items.filter((i) => selected.has(i.value)).map((i) => i.label);
     }, [items, values]);

     const buttonLabel = React.useMemo(() => {
       if (!selectedLabels.length) return placeholder;
       if (selectedLabels.length <= 2) return selectedLabels.join(', ');
       return `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`;
     }, [placeholder, selectedLabels]);

     const handleToggle = (nextValue: string) => {
       const exists = values.includes(nextValue);
       const nextValues = exists
         ? values.filter((v) => v !== nextValue)
         : [...values, nextValue];

       onChange(nextValues);
     };

     return (
       <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
           <Button
             ref={ref}
             variant="outline"
             role="combobox"
             aria-expanded={open}
             className={cn(widthClassName, 'justify-between')}
             disabled={disabled}
           >
             {buttonLabel}
             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
           </Button>
         </PopoverTrigger>
         <PopoverContent className={cn(widthClassName, 'p-0')}>
           <Command>
             <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
             <CommandList>
               <CommandEmpty>{emptyText}</CommandEmpty>
               <CommandGroup>
                 {actionLabel && onAction ? (
                   <CommandItem
                     value={actionLabel}
                     onSelect={() => {
                       onAction();
                       setOpen(false);
                     }}
                   >
                     {actionLabel}
                   </CommandItem>
                 ) : null}
                 {items.map((item) => {
                   const selected = values.includes(item.value);
                   return (
                     <CommandItem
                       key={item.value}
                       value={item.label}
                       onSelect={() => handleToggle(item.value)}
                     >
                       <CheckIcon
                         className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')}
                       />
                       {item.label}
                     </CommandItem>
                   );
                 })}
               </CommandGroup>
             </CommandList>
           </Command>
         </PopoverContent>
       </Popover>
     );
   },
 );

 MultiSwitcher.displayName = 'MultiSwitcher';

export default Switcher;
