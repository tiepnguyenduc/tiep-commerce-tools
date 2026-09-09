export interface QuantitySelectorProps {
  value?: number;
  editable?: boolean;
  label?: string;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  disabled?: boolean;
  className?: string;
  onChange?: (val: number) => void;
}
