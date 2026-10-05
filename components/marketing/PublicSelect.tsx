'use client';

import { useId, type ReactNode } from 'react';
import { Select } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

/** Shared visual and keyboard behavior; Base UI owns focus, typeahead and form value. */
export function PublicSelect({ name, label, options, value, defaultValue, onValueChange, required, full = false }: {
  name: string; label: ReactNode; options: { value: string; label: string }[];
  value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
  required?: boolean; full?: boolean;
}) {
  const id = useId();
  return <div className={`field public-select${full ? ' full' : ''}`}>
    <label id={`${id}-label`} htmlFor={id}>{label}</label>
    <Select.Root modal={false} name={name} items={options} value={value} defaultValue={defaultValue} required={required} onValueChange={next => onValueChange?.(next ?? '')}>
      <Select.Trigger id={id} aria-labelledby={`${id}-label`} className="public-select-trigger" data-select-name={name}>
        <Select.Value /><Select.Icon><ChevronDown size={18} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal><Select.Positioner className="public-select-positioner" sideOffset={8} alignItemWithTrigger={false}>
        <Select.Popup className="public-select-popup"><Select.List>
          {options.map(option => <Select.Item key={option.value} value={option.value} data-option-value={option.value} className="public-select-option">
            <Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator><Check size={18} aria-hidden="true" /></Select.ItemIndicator>
          </Select.Item>)}
        </Select.List></Select.Popup>
      </Select.Positioner></Select.Portal>
    </Select.Root>
  </div>;
}
