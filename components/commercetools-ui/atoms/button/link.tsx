import Link from "next/link";
import type { ComponentProps } from "react";
import type { ButtonSize, ButtonVariant } from "./index";
import useButtonClassNames from "./useButtonClassNames";

export default function ButtonLink({variant = "primary", size = "m", className, ...props}: ComponentProps<typeof Link> & {variant?: ButtonVariant; size?: ButtonSize}) {
  return <Link {...props} className={useButtonClassNames({variant, size, className, includesIcon:false})} />;
}
