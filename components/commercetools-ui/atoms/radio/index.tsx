"use client";
import React from 'react';
interface Props extends React.ComponentProps<'input'> {
  inputClassName?: string;
  onChecked?: () => void;
}
const Radio = ({className = '', inputClassName = '', onChecked, onChange, children, ...props}: Props) => {
  const input = <input {...props} type="radio" className={`ct-ui h-20 w-20 rounded-full border border-gray-600 accent-gray-600 ${inputClassName} ${children ? '' : className}`}
    onChange={(event) => { onChange?.(event); onChecked?.(); }} />;
  return children ? <label className={`inline-flex items-center gap-12 ${className}`}>{input}{children}</label> : input;
};
export default Radio;
