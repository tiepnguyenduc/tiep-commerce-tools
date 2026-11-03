"use client";
import WishlistItem from "@/components/commercetools-ui/molecules/wishlist-item";

import UIInput from "@/components/commercetools-ui/atoms/input";
import Button from "@/components/commercetools-ui/atoms/button";
import { useMemo, useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPen,
  faPlus,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/Toast";
import { WishlistModal } from "@/components/WishlistModal";
import {
  createWishlist,
  deleteWishlist,
  removeItemFromWishlist,
  renameWishlist,
  useWishlists,
} from "@/lib/wishlist-api";

export function WishlistsPage() {
  const { wishlists, isLoading, error } = useWishlists();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingLineId, setRemovingLineId] = useState<string | null>(null);
  const showToast = useToast();
  const selected = useMemo(
    () => wishlists.find((wishlist) => wishlist.id === selectedId) ?? null,
    [selectedId, wishlists],
  );

  async function submitNewWishlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const wishlist = await createWishlist(name);
      setNewName("");
      setShowCreate(false);
      setSelectedId(wishlist.id);
      showToast(`${wishlist.name} was created.`, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the wishlist.",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  async function removeWishlist(id: string, name: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteWishlist(id);
      if (selectedId === id) setSelectedId(null);
      showToast(`${name} was deleted.`, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the wishlist.",
        "error",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openRename(id: string, name: string) {
    setRenameTarget({ id, name });
    setRenameName(name);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = renameName.trim();
    if (!renameTarget || !name || name === renameTarget.name || savingRename) {
      return;
    }

    setSavingRename(true);
    try {
      const wishlist = await renameWishlist(renameTarget.id, name);
      setRenameTarget(null);
      setRenameName("");
      showToast(`Wishlist renamed to ${wishlist.name}.`, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not rename the wishlist.",
        "error",
      );
    } finally {
      setSavingRename(false);
    }
  }

  async function removeLine(wishlistId: string, lineItemId: string) {
    if (removingLineId) return;
    setRemovingLineId(lineItemId);
    try {
      await removeItemFromWishlist(wishlistId, lineItemId);
      showToast("Item removed from the wishlist.", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not remove the item.",
        "error",
      );
    } finally {
      setRemovingLineId(null);
    }
  }

  const renameModal = renameTarget ? (
    <WishlistModal
      onClose={() => {
        if (!savingRename) setRenameTarget(null);
      }}
      title="Rename wishlist"
    >
      <form className="wishlist-create-form" onSubmit={submitRename}>
        <label htmlFor="wishlist-rename">Wishlist name</label>
        <UIInput
          autoFocus

          id="wishlist-rename"
          maxLength={100}
          onChange={(event) => setRenameName(event.target.value)}
          required
          value={renameName}
        />
        <div className="wishlist-modal-actions">
          <Button
            variant="ghost"
            size="fit"
            className="pill"
            disabled={savingRename}
            onClick={() => setRenameTarget(null)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={
              savingRename ||
              !renameName.trim() ||
              renameName.trim() === renameTarget.name
            }
            type="submit"
          >
            {savingRename ? "Saving…" : "Save name"}
          </Button>
        </div>
      </form>
    </WishlistModal>
  ) : null;

  if (isLoading) return <p className="muted">Loading wishlists...</p>;
  if (error) return <p className="muted">{error}</p>;

  if (selected) {
    return (
      <div className="account-stack">
        <div className="wishlist-detail-head">
          <Button
            variant="ghost"
            size="fit"
            className="text-button"
            onClick={() => setSelectedId(null)}
            type="button"
          >
            <FontAwesomeIcon aria-hidden="true" icon={faArrowLeft} />
            All wishlists
          </Button>
          <div className="wishlist-detail-actions">
            <Button
              variant="ghost"
              size="fit"
              className="text-button"
              disabled={savingRename}
              onClick={() => openRename(selected.id, selected.name)}
              type="button"
            >
              <FontAwesomeIcon aria-hidden="true" icon={faPen} />
              Rename
            </Button>
            {!selected.isDefault && (
              <Button
                variant="ghost"
                size="fit"
                className="text-button danger"
                disabled={deletingId !== null}
                onClick={() => removeWishlist(selected.id, selected.name)}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faTrashCan} />
                {deletingId === selected.id ? "Deleting…" : "Delete wishlist"}
              </Button>
            )}
          </div>
        </div>
        <div className="wishlist-detail-title">
          <div>
            <h3>{selected.name}</h3>
            <p className="muted">
              {selected.lines.length} item
              {selected.lines.length === 1 ? "" : "s"}
            </p>
          </div>
          {selected.isDefault && (
            <span className="wishlist-default-badge">Default</span>
          )}
        </div>
        {selected.lines.length === 0 ? (
          <div className="wishlist-empty">
            <h3>This wishlist is empty.</h3>
            <p className="muted">
              Use the heart on any product to save it here.
            </p>
          </div>
        ) : (
          <div className="wishlist-list">
            {selected.lines.map((line) => (
              <article className="launchpad-ui" key={line.id}>
                <WishlistItem
                  item={{
                    lineItemId: line.id,
                    productId: line.productId,
                    name: line.name,
                    count: line.quantity,
                    variant: { sku: line.sku, images: [line.image] },
                  }}
                  imageSuffix={false}
                  disabled={removingLineId !== null}
                  onRemove={() => removeLine(selected.id, line.id)}
                  details={
                    <p className="storefront-line-details">
                      SKU: {line.sku} · Quantity: {line.quantity}
                    </p>
                  }
                />
              </article>
            ))}
          </div>
        )}
        {renameModal}
      </div>
    );
  }

  return (
    <div className="account-stack">
      <div className="wishlist-overview-head">
        <p className="muted">
          Organise saved products into separate lists for projects, rooms, or
          gifts.
        </p>
        <Button
          variant="primary"
          className="gap-10"
          onClick={() => setShowCreate(true)}
          type="button"
        >
          <FontAwesomeIcon aria-hidden="true" icon={faPlus} />
          Create new wishlist
        </Button>
      </div>

      <div className="wishlist-card-grid">
        {wishlists.map((wishlist) => (
          <article className="wishlist-card" key={wishlist.id}>
            <Button
              variant="ghost"
              size="fit"
              className="wishlist-card-open"
              onClick={() => setSelectedId(wishlist.id)}
              type="button"
            >
              <span className="wishlist-card-title">
                <strong>{wishlist.name}</strong>
                {wishlist.isDefault && (
                  <small className="wishlist-default-badge">Default</small>
                )}
              </span>
              <span className="muted">
                {wishlist.lines.length} item
                {wishlist.lines.length === 1 ? "" : "s"}
              </span>
              <span className="wishlist-card-images" aria-hidden="true">
                {wishlist.lines.slice(0, 3).map((line) => (
                  <img src={line.image} alt="" key={line.id} />
                ))}
                {wishlist.lines.length === 0 && <i>No saved items yet</i>}
              </span>
            </Button>
            <span className="wishlist-card-actions">
              <Button
                variant="ghost"
                size="fit"
                aria-label={`Rename ${wishlist.name}`}
                className="wishlist-card-action"
                disabled={savingRename}
                onClick={() => openRename(wishlist.id, wishlist.name)}
                title="Rename wishlist"
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faPen} />
              </Button>
              {!wishlist.isDefault && (
                <Button
                  variant="ghost"
                  size="fit"
                  aria-label={`Delete ${wishlist.name}`}
                  className="wishlist-card-action danger"
                  disabled={deletingId !== null}
                  onClick={() => removeWishlist(wishlist.id, wishlist.name)}
                  title="Delete wishlist"
                  type="button"
                >
                  <FontAwesomeIcon aria-hidden="true" icon={faTrashCan} />
                </Button>
              )}
            </span>
          </article>
        ))}
      </div>

      {renameModal}

      {showCreate && (
        <WishlistModal
          onClose={() => {
            if (!creating) setShowCreate(false);
          }}
          title="Create new wishlist"
        >
          <form className="wishlist-create-form" onSubmit={submitNewWishlist}>
            <label htmlFor="wishlist-name">Wishlist name</label>
            <UIInput
              autoFocus

              id="wishlist-name"
              maxLength={100}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Living room"
              required
              value={newName}
            />
            <div className="wishlist-modal-actions">
              <Button
                variant="ghost"
                size="fit"
                className="pill"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={creating || !newName.trim()}
                type="submit"
              >
                {creating ? "Creating…" : "Create wishlist"}
              </Button>
            </div>
          </form>
        </WishlistModal>
      )}
    </div>
  );
}
