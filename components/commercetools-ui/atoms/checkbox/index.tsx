"use client";
import React from 'react';
export interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  label?: string;
  labelPosition?: 'on-left' | 'on-right';
  containerClassName?: string;
  onChange?: (props: { name: string; checked: boolean }) => void;
  onNativeChange?: React.ChangeEventHandler<HTMLInputElement>;
  disableBackground?: boolean;
}
const Checkbox = ({label, labelPosition = 'on-right', containerClassName = '', className = '',
  onChange, onNativeChange, disableBackground, ...props}: CheckboxProps) => {
  const input = <input {...props} type="checkbox" className={`ct-ui h-20 w-20 rounded-sm border border-neutral-400 accent-gray-600 ${className}`}
    onChange={(event) => { onNativeChange?.(event); onChange?.({name:event.target.name, checked:event.target.checked}); }} />;
  return label ? <label className={`inline-flex items-center gap-12 ${containerClassName}`}>
    {labelPosition === 'on-left' && label}{input}{labelPosition === 'on-right' && label}
  </label> : input;
};
export default Checkbox;
