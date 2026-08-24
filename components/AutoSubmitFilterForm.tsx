"use client";

import { type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function AutoSubmitFilterForm({
  action,
  children,
}: {
  action: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function navigate(form: HTMLFormElement) {
    const search = new URLSearchParams();
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      const stringValue = value.toString();
      if (stringValue) search.append(key, stringValue);
    }

    search.delete("page");
    search.delete("category");

    const query = search.toString();
    router.push(query ? `${action}?${query}` : action, { scroll: false });
  }

  function submitOnChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      target instanceof HTMLSelectElement ||
      target instanceof HTMLInputElement
    ) {
      navigate(event.currentTarget);
    }
  }

  function submitWithoutReload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(event.currentTarget);
  }

  return (
    <form
      action={action}
      className="filter-form"
      method="get"
      onChange={submitOnChange}
      onSubmit={submitWithoutReload}
    >
      {children}
    </form>
  );
}
