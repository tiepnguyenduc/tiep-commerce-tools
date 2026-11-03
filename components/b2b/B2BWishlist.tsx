"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  HeartIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Button from "@/components/commercetools-ui/atoms/button";
import Input from "@/components/commercetools-ui/atoms/input";
import { WishlistModal } from "@/components/WishlistModal";
import { useToast } from "@/components/Toast";
import type { Wishlist } from "@/lib/types";
import { useB2B } from "./B2BProvider";
import { useB2BMiniCart } from "./B2BMiniCart";
import { B2BAccountWorkspace } from "./B2BAccountWorkspace";
import { useB2BTranslations } from "./useB2BTranslations";
import s from "./B2BTools.module.css";

type WishlistContext = {
  wishlists: Wishlist[];
  ready: boolean;
  pending: string | null;
  error: string;
  reload: () => Promise<Wishlist[]>;
  create: (name: string) => Promise<Wishlist>;
  rename: (id: string, name: string) => Promise<Wishlist>;
  removeList: (id: string) => Promise<void>;
  toggle: (
    wishlistId: string,
    productId: string,
    variantId?: number,
  ) => Promise<void>;
  removeLine: (wishlistId: string, lineItemId: string) => Promise<void>;
};

const Context = createContext<WishlistContext | null>(null);

function matchingLine(
  wishlist: Wishlist,
  productId: string,
  variantId?: number,
) {
  return wishlist.lines.find(
    (line) =>
      line.productId === productId &&
      (variantId === undefined || line.variantId === variantId),
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      (data as { error?: string }).error || "Wishlist request failed.",
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export function B2BWishlistProvider({ children }: { children: ReactNode }) {
  const { state } = useB2B();
  const customerId = state?.customer?.id || "";
  const customerIdRef = useRef(customerId);
  customerIdRef.current = customerId;
  const [ownerId, setOwnerId] = useState("");
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  function upsert(wishlist: Wishlist) {
    setWishlists((current) =>
      current.some((entry) => entry.id === wishlist.id)
        ? current.map((entry) => (entry.id === wishlist.id ? wishlist : entry))
        : [...current, wishlist],
    );
    return wishlist;
  }

  async function load(owner = customerId) {
    setPending(null);
    if (!owner) {
      setOwnerId("");
      setWishlists([]);
      setStatus("ready");
      setError("");
      return [];
    }
    setOwnerId(owner);
    setStatus("loading");
    setError("");
    try {
      const data = await readJson<{ wishlists: Wishlist[] }>(
        await fetch("/api/b2b/wishlists", { cache: "no-store" }),
      );
      if (customerIdRef.current === owner) {
        setWishlists(data.wishlists);
        setStatus("ready");
      }
      return data.wishlists;
    } catch (requestError) {
      if (customerIdRef.current === owner) {
        setWishlists([]);
        setStatus("error");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Wishlist request failed.",
        );
      }
      throw requestError;
    }
  }

  useEffect(() => {
    if (state === null) return;
    void load(customerId).catch(() => undefined);
  }, [customerId, state === null]);

  const ready = state !== null && ownerId === customerId && status === "ready";

  async function create(name: string) {
    const data = await readJson<{ wishlist: Wishlist }>(
      await fetch("/api/b2b/wishlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    );
    return upsert(data.wishlist);
  }

  async function rename(id: string, name: string) {
    const data = await readJson<{ wishlist: Wishlist }>(
      await fetch(`/api/b2b/wishlists/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    );
    return upsert(data.wishlist);
  }

  async function removeList(id: string) {
    const data = await readJson<{ deletedId: string }>(
      await fetch(`/api/b2b/wishlists/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    );
    setWishlists((current) =>
      current.filter((entry) => entry.id !== data.deletedId),
    );
  }

  async function removeLine(wishlistId: string, lineItemId: string) {
    const operationKey = `${wishlistId}:${lineItemId}`;
    setPending(operationKey);
    try {
      const data = await readJson<{ wishlist: Wishlist }>(
        await fetch(
          `/api/b2b/wishlists/${encodeURIComponent(wishlistId)}/items?lineItemId=${encodeURIComponent(lineItemId)}`,
          { method: "DELETE" },
        ),
      );
      upsert(data.wishlist);
    } finally {
      setPending(null);
    }
  }

  async function toggle(
    wishlistId: string,
    productId: string,
    variantId?: number,
  ) {
    const wishlist = wishlists.find((entry) => entry.id === wishlistId);
    if (pending) return;
    const line = wishlist
      ? matchingLine(wishlist, productId, variantId)
      : undefined;
    if (line) {
      await removeLine(wishlistId, line.id);
      return;
    }
    const operationKey = `${wishlistId}:${productId}:${variantId ?? "default"}`;
    setPending(operationKey);
    try {
      const data = await readJson<{ wishlist: Wishlist }>(
        await fetch(
          `/api/b2b/wishlists/${encodeURIComponent(wishlistId)}/items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, variantId }),
          },
        ),
      );
      upsert(data.wishlist);
    } finally {
      setPending(null);
    }
  }

  return (
    <Context.Provider
      value={{
        wishlists,
        ready,
        pending,
        error,
        reload: () => load(customerId),
        create,
        rename,
        removeList,
        toggle,
        removeLine,
      }}
    >
      {children}
    </Context.Provider>
  );
}

function useB2BWishlist() {
  const context = useContext(Context);
  if (!context) throw new Error("B2BWishlistProvider required");
  return context;
}

export function B2BSaveButton({
  productId,
  variantId,
  compact = false,
}: {
  productId: string;
  variantId?: number;
  compact?: boolean;
}) {
  const { t } = useB2BTranslations();
  const { state } = useB2B();
  const { wishlists, ready, pending, reload, create, toggle } =
    useB2BWishlist();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const showToast = useToast();
  const saved = wishlists.some((wishlist) =>
    Boolean(matchingLine(wishlist, productId, variantId)),
  );

  async function openPicker() {
    if (!state?.customer) {
      window.location.assign("/b2b/account");
      return;
    }
    try {
      if (!ready) await reload();
      setOpen(true);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not load wishlists.",
        "error",
      );
    }
  }

  async function toggleList(wishlist: Wishlist) {
    try {
      const wasSaved = Boolean(matchingLine(wishlist, productId, variantId));
      await toggle(wishlist.id, productId, variantId);
      showToast(
        wasSaved
          ? `Removed from ${wishlist.name}.`
          : `Saved to ${wishlist.name}.`,
        "success",
      );
      setOpen(false);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the wishlist.",
        "error",
      );
    }
  }

  async function createAndSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName || busy) return;
    setBusy(true);
    try {
      const wishlist = await create(nextName);
      await toggle(wishlist.id, productId, variantId);
      showToast(`Created ${wishlist.name} and saved the product.`, "success");
      setName("");
      setShowCreate(false);
      setOpen(false);
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the wishlist.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={compact ? s.iconToggle : s.toggle}
        aria-label={
          pending
            ? t("Updating wishlist…")
            : saved
              ? t("Manage product wishlists")
              : t("Add product to wishlist")
        }
        aria-pressed={saved}
        title={saved ? t("Manage wishlists") : t("Add to wishlist")}
        disabled={busy || pending !== null}
        onClick={() => void openPicker()}
      >
        <HeartIcon aria-hidden="true" />
        {!compact &&
          (pending
            ? t("Updating wishlist…")
            : saved
              ? t("In My Wishlist")
              : t("Add to My Wishlist"))}
      </button>
      {open && (
        <WishlistModal
          onClose={() => setOpen(false)}
          title={showCreate ? "Create new wishlist" : "Add to wishlist"}
        >
          {showCreate ? (
            <form className="wishlist-create-form" onSubmit={createAndSave}>
              <Button
                variant="ghost"
                size="fit"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                <ArrowLeftIcon aria-hidden="true" width={16} /> Back to
                wishlists
              </Button>
              <label htmlFor={`b2b-wishlist-${productId}`}>Wishlist name</label>
              <Input
                id={`b2b-wishlist-${productId}`}
                value={name}
                maxLength={100}
                required
                autoFocus
                onChange={(event) => setName(event.target.value)}
              />
              <div className="wishlist-modal-actions">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={!name.trim() || busy}
                >
                  {busy ? "Creating…" : "Create and save"}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <p className="wishlist-picker-intro">
                Choose a list to save this product. Select a saved list to
                remove it.
              </p>
              <div className="wishlist-picker-list">
                {wishlists.map((wishlist) => {
                  const inList = Boolean(
                    matchingLine(wishlist, productId, variantId),
                  );
                  return (
                    <Button
                      variant={inList ? "primary" : "secondary"}
                      size="s"
                      className={`wishlist-picker-option${inList ? " saved" : ""}`}
                      aria-pressed={inList}
                      disabled={pending !== null}
                      key={wishlist.id}
                      onClick={() => void toggleList(wishlist)}
                      type="button"
                    >
                      <span>
                        <strong>{wishlist.name}</strong>
                        {wishlist.isDefault && <small>Default</small>}
                      </span>
                      <span className="wishlist-picker-count">
                        {wishlist.lines.length} item
                        {wishlist.lines.length === 1 ? "" : "s"}
                        {inList && <CheckIcon aria-hidden="true" width={16} />}
                      </span>
                    </Button>
                  );
                })}
              </div>
              <div className="wishlist-picker-footer">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCreate(true)}
                >
                  <PlusIcon aria-hidden="true" width={16} /> Create new wishlist
                </Button>
                <Link
                  className="wishlist-manage-link"
                  href="/b2b/wishlist"
                  onClick={() => setOpen(false)}
                >
                  Manage wishlists
                </Link>
              </div>
            </>
          )}
        </WishlistModal>
      )}
    </>
  );
}

export function B2BHeaderWishlistLink() {
  const { t } = useB2BTranslations();
  const { wishlists } = useB2BWishlist();
  const count = wishlists.reduce(
    (total, wishlist) => total + wishlist.lines.length,
    0,
  );
  return (
    <Link
      href="/b2b/wishlist"
      aria-label={`${t("My Wishlist")}, ${count} items`}
    >
      <HeartIcon aria-hidden="true" />
      <span>
        {t("My Wishlist")}
        {count ? ` (${count})` : ""}
      </span>
    </Link>
  );
}

export function B2BWishlistPage() {
  const { state, busy, act } = useB2B();
  const { openCart } = useB2BMiniCart();
  const {
    wishlists,
    ready,
    error,
    reload,
    pending,
    create,
    rename,
    removeList,
    removeLine,
  } = useB2BWishlist();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameTarget, setRenameTarget] = useState<Wishlist | null>(null);
  const [renameName, setRenameName] = useState("");
  const [saving, setSaving] = useState(false);
  const showToast = useToast();
  const selected = useMemo(
    () => wishlists.find((entry) => entry.id === selectedId) ?? null,
    [selectedId, wishlists],
  );

  useEffect(() => {
    setSelectedId(null);
  }, [state?.customer?.id]);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const wishlist = await create(newName.trim());
      setSelectedId(wishlist.id);
      setNewName("");
      setShowCreate(false);
      showToast(`${wishlist.name} was created.`, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the wishlist.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renameTarget || !renameName.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await rename(renameTarget.id, renameName.trim());
      setRenameTarget(null);
      showToast(`Wishlist renamed to ${updated.name}.`, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not rename the wishlist.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteList(wishlist: Wishlist) {
    if (saving) return;
    setSaving(true);
    try {
      await removeList(wishlist.id);
      if (selectedId === wishlist.id) setSelectedId(null);
      showToast(`${wishlist.name} was deleted.`, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the wishlist.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  const modal = renameTarget ? (
    <WishlistModal
      title="Rename wishlist"
      onClose={() => !saving && setRenameTarget(null)}
    >
      <form className="wishlist-create-form" onSubmit={submitRename}>
        <label htmlFor="b2b-wishlist-rename">Wishlist name</label>
        <Input
          id="b2b-wishlist-rename"
          value={renameName}
          maxLength={100}
          required
          autoFocus
          onChange={(event) => setRenameName(event.target.value)}
        />
        <div className="wishlist-modal-actions">
          <Button
            variant="secondary"
            type="button"
            disabled={saving}
            onClick={() => setRenameTarget(null)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving || !renameName.trim()}
          >
            {saving ? "Saving…" : "Save name"}
          </Button>
        </div>
      </form>
    </WishlistModal>
  ) : null;

  return (
    <B2BAccountWorkspace
      title="My Wishlist"
      description="Organise products into personal lists and return to them from either storefront."
    >
      {!state?.customer || !ready ? (
        <div className={s.empty} role="status">
          {error ? (
            <>
              <p>My Wishlist is temporarily unavailable.</p>
              <button
                className={s.button}
                type="button"
                onClick={() => void reload()}
              >
                Try again
              </button>
            </>
          ) : (
            "Loading My Wishlist…"
          )}
        </div>
      ) : selected ? (
        <div className={s.wishlistStack}>
          <div className={s.wishlistToolbar}>
            <button type="button" onClick={() => setSelectedId(null)}>
              <ArrowLeftIcon aria-hidden="true" /> All wishlists
            </button>
            <div>
              <button
                type="button"
                onClick={() => {
                  setRenameTarget(selected);
                  setRenameName(selected.name);
                }}
              >
                <PencilIcon aria-hidden="true" /> Rename
              </button>
              {!selected.isDefault && (
                <button
                  type="button"
                  className={s.danger}
                  onClick={() => void deleteList(selected)}
                >
                  <TrashIcon aria-hidden="true" /> Delete
                </button>
              )}
            </div>
          </div>
          <div className={s.wishlistTitle}>
            <div>
              <h2>{selected.name}</h2>
              <p>
                {selected.lines.length} item
                {selected.lines.length === 1 ? "" : "s"}
              </p>
            </div>
            {selected.isDefault && <span>Default</span>}
          </div>
          {!selected.lines.length ? (
            <div className={s.empty}>
              <h2>This wishlist is empty.</h2>
              <p>
                Use “Add to My Wishlist” while browsing to save products here.
              </p>
              <Link href="/b2b/products">Explore equipment →</Link>
            </div>
          ) : (
            <div className={s.grid}>
              {selected.lines.map((line) => {
                const product = state.products.find(
                  (entry) => entry.id === line.productId,
                );
                const variant =
                  product?.variants.find(
                    (entry) => entry.id === line.variantId,
                  ) ?? product?.variants[0];
                return (
                  <article className={s.product} key={line.id}>
                    {line.image && <img src={line.image} alt="" />}
                    <h2>{line.name}</h2>
                    <p>SKU: {line.sku}</p>
                    <p>
                      {state.context
                        ? variant?.price?.formatted || "Price unavailable"
                        : "Select a store for pricing"}
                    </p>
                    <div className={s.actions}>
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={async () => {
                          try {
                            await removeLine(selected.id, line.id);
                            showToast(
                              "Item removed from the wishlist.",
                              "success",
                            );
                          } catch (requestError) {
                            showToast(
                              requestError instanceof Error
                                ? requestError.message
                                : "Could not remove the item.",
                              "error",
                            );
                          }
                        }}
                      >
                        Remove
                      </button>
                      {product && variant && (
                        <button
                          className={s.primary}
                          type="button"
                          disabled={busy || !state.context || !variant.price}
                          onClick={async () => {
                            const success = await act({
                              action: "add-to-cart",
                              productId: product.id,
                              variantId: variant.id,
                              quantity: 1,
                            });
                            showToast(
                              success
                                ? `${product.name} added to your bag.`
                                : "The result could not be confirmed. Check your bag before trying again.",
                              success ? "success" : "error",
                            );
                            if (success) openCart();
                          }}
                        >
                          Add 1 to bag
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {modal}
        </div>
      ) : (
        <div className={s.wishlistStack}>
          <div className={s.wishlistOverview}>
            <p>
              Create separate lists for projects, teams, or future purchases.
            </p>
            <button
              className={s.primaryAction}
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <PlusIcon aria-hidden="true" /> Create new wishlist
            </button>
          </div>
          <div className={s.wishlistCards}>
            {wishlists.map((wishlist) => (
              <article className={s.wishlistCard} key={wishlist.id}>
                <button
                  className={s.wishlistOpen}
                  type="button"
                  onClick={() => setSelectedId(wishlist.id)}
                >
                  <span className={s.wishlistCardTitle}>
                    <strong>{wishlist.name}</strong>
                    {wishlist.isDefault && <small>Default</small>}
                  </span>
                  <span>
                    {wishlist.lines.length} item
                    {wishlist.lines.length === 1 ? "" : "s"}
                  </span>
                  <span className={s.wishlistImages}>
                    {wishlist.lines.slice(0, 3).map((line) => (
                      <img src={line.image} alt="" key={line.id} />
                    ))}
                    {!wishlist.lines.length && <i>No saved items yet</i>}
                  </span>
                </button>
                <div className={s.wishlistCardActions}>
                  <button
                    type="button"
                    aria-label={`Rename ${wishlist.name}`}
                    onClick={() => {
                      setRenameTarget(wishlist);
                      setRenameName(wishlist.name);
                    }}
                  >
                    <PencilIcon aria-hidden="true" />
                  </button>
                  {!wishlist.isDefault && (
                    <button
                      type="button"
                      className={s.danger}
                      aria-label={`Delete ${wishlist.name}`}
                      onClick={() => void deleteList(wishlist)}
                    >
                      <TrashIcon aria-hidden="true" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {showCreate && (
            <WishlistModal
              title="Create new wishlist"
              onClose={() => !saving && setShowCreate(false)}
            >
              <form className="wishlist-create-form" onSubmit={submitCreate}>
                <label htmlFor="b2b-wishlist-name">Wishlist name</label>
                <Input
                  id="b2b-wishlist-name"
                  value={newName}
                  maxLength={100}
                  required
                  autoFocus
                  placeholder="e.g. Site equipment"
                  onChange={(event) => setNewName(event.target.value)}
                />
                <div className="wishlist-modal-actions">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={saving || !newName.trim()}
                  >
                    {saving ? "Creating…" : "Create wishlist"}
                  </Button>
                </div>
              </form>
            </WishlistModal>
          )}
          {modal}
        </div>
      )}
    </B2BAccountWorkspace>
  );
}
