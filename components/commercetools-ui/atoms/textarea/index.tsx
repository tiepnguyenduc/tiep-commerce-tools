import type { ComponentProps } from "react";
export default function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`ct-ui w-full rounded-md border border-gray-300 bg-white p-12 text-14 focus:border-gray-500 disabled:bg-neutral-200 ${className}`} {...props} />;
}
