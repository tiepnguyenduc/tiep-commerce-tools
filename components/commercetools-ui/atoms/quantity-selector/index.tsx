"use client";
import React, { useCallback, useEffect, useState } from 'react';
import useClassNames from '@/lib/launchpad/helpers/hooks/useClassNames';
import useControllableState from '@/lib/launchpad/helpers/hooks/useControllable';
import { QuantitySelectorProps } from './types';

const QuantitySelector = ({
  value: valueProp,
  editable = false,
  label = "Quantity",
  defaultValue = 0,
  minValue = -Infinity,
  maxValue = Infinity,
  disabled = false,
  className: classNameProp,
  onChange,
}: QuantitySelectorProps) => {
  const [value, setValue] = useControllableState(valueProp, defaultValue);

  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);

  const className = useClassNames([
    'ct-ui flex w-fit items-center gap-12 rounded-sm border border-neutral-400 transition hover:border-neutral-800',
    disabled ? 'cursor-not-allowed bg-neutral-200 text-gray-400' : 'cursor-pointer bg-white text-gray-600',
    classNameProp,
  ]);

  const normalizeValue = useCallback(
    (val: number) => Math.max(minValue, Math.min(maxValue, val)),
    [minValue, maxValue],
  );

  const handleChange = useCallback(
    (val: number) => {
      if (disabled) return;

      const normalizedValue = normalizeValue(val);

      if (normalizedValue === value) return;
      setValue(normalizedValue);
      onChange?.(normalizedValue);
    },
    [setValue, normalizeValue, onChange, disabled, value],
  );

  return (
    <div className={className}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= minValue}
        onClick={() => handleChange(value - 1)}
        className="w-36 cursor-[inherit] self-stretch border-r border-neutral-200 px-12 py-3 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-gray-400"
      >
        {`-`}
      </button>
      {editable ? <input type="text" aria-label={label} min={Number.isFinite(minValue) ? minValue : undefined} max={Number.isFinite(maxValue) ? maxValue : undefined} step={1} disabled={disabled} value={draft}
        className="w-48 border-0 bg-transparent p-0 text-center text-14"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => { const next = Number(draft); if (draft.trim() && Number.isInteger(next)) { const normalized = normalizeValue(next); setDraft(String(normalized)); handleChange(normalized); } else setDraft(String(value)); }}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
        : <output aria-live="polite" className="py-3 text-14">{value}</output>}
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= maxValue}
        onClick={() => handleChange(value + 1)}
        className="w-36 cursor-[inherit] self-stretch border-l border-neutral-200 px-12 py-3 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-gray-400"
      >
        {`+`}
      </button>
    </div>
  );
};

export default QuantitySelector;
