"use client";

import UIButton from "@/components/commercetools-ui/atoms/button";
import UIInput from "@/components/commercetools-ui/atoms/input";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck, faHeart, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/Toast";
import { WishlistModal } from "@/components/WishlistModal";
import { addItemToWishlist, createWishlist, loadWishlists, removeItemFromWishlist, useWishlists } from "@/lib/wishlist-api";
import type { Wishlist } from "@/lib/types";

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

export function AddToWishlist({
  productId,
  variantId,
  compact = false,
}: {
  productId: string;
  variantId?: number;
  compact?: boolean;
}) {
  const { wishlists, status } = useWishlists();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingWishlistId, setPendingWishlistId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState("");
  const [creatingWishlist, setCreatingWishlist] = useState(false);
  const isSaved = wishlists.some((wishlist) =>
    Boolean(matchingLine(wishlist, productId, variantId)),
  );
  const router = useRouter();
  const showToast = useToast();

  function closePicker() {
    setIsOpen(false);
    setShowCreateForm(false);
    setNewWishlistName("");
  }

  async function openPicker() {
    if (busy) return;
    setBusy(true);
    try {
      await loadWishlists();
      setShowCreateForm(false);
      setIsOpen(true);
    } catch (error) {
      const responseStatus = (error as Error & { status?: number })?.status;
      if (responseStatus === 401 || status === "unauthenticated") {
        showToast("Please log in to save products to a wishlist.", "info");
        router.push("/account");
      } else {
        showToast(
          error instanceof Error ? error.message : "Could not load wishlists.",
          "error",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleList(wishlist: Wishlist) {
    if (pendingWishlistId) return;
    setPendingWishlistId(wishlist.id);
    const line = matchingLine(wishlist, productId, variantId);
    try {
      if (line) {
        await removeItemFromWishlist(wishlist.id, line.id);
        showToast(`Removed from ${wishlist.name}.`, "success");
      } else {
        await addItemToWishlist(wishlist.id, { productId, variantId });
        showToast(`Saved to ${wishlist.name}.`, "success");
      }
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update the wishlist.",
        "error",
      );
    } finally {
      setPendingWishlistId(null);
    }
  }

  async function createAndSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newWishlistName.trim();
    if (!name || creatingWishlist) return;

    setCreatingWishlist(true);
    let created: Wishlist | null = null;
    try {
      created = await createWishlist(name);
      await addItemToWishlist(created.id, { productId, variantId });
      showToast(`Created ${created.name} and saved the product.`, "success");
      closePicker();
      router.refresh();
    } catch (error) {
      if (created) {
        setShowCreateForm(false);
        setNewWishlistName("");
        showToast(
          `${created.name} was created, but the product could not be added. Select the list to try again.`,
          "error",
        );
      } else {
        showToast(
          error instanceof Error
            ? error.message
            : "Could not create the wishlist.",
          "error",
        );
      }
    } finally {
      setCreatingWishlist(false);
    }
  }

  return (
    <>
      <UIButton variant="secondary" size="icon"
        aria-label={
          isSaved
            ? "Manage product wishlists"
            : busy
              ? "Loading wishlists"
              : "Add product to wishlist"
        }
        aria-pressed={isSaved}
        className={`wishlist-button${compact ? " compact" : ""}${
          isSaved ? " saved" : ""
        }`}
        disabled={busy}
        onClick={openPicker}
        title={isSaved ? "Manage wishlists" : "Add to wishlist"}
        type="button"
      >
        <FontAwesomeIcon aria-hidden="true" icon={faHeart} />
      </UIButton>

      {isOpen && (
        <WishlistModal
          onClose={closePicker}
          title={showCreateForm ? "Create new wishlist" : "Add to wishlist"}
        >
          {showCreateForm ? (
            <>
              <UIButton variant="ghost" size="fit"
                className="text-button wishlist-picker-back"
                disabled={creatingWishlist}
                onClick={() => setShowCreateForm(false)}
                type="button"
              >
                <FontAwesomeIcon aria-hidden="true" icon={faArrowLeft} />
                Back to wishlists
              </UIButton>
              <form className="wishlist-create-form" onSubmit={createAndSave}>
                <label htmlFor={`new-wishlist-${productId}`}>Wishlist name</label>
                <UIInput
                  autoFocus

                  id={`new-wishlist-${productId}`}
                  maxLength={100}
                  onChange={(event) => setNewWishlistName(event.target.value)}
                  placeholder="e.g. Living room"
                  required
                  value={newWishlistName}
                />
                <p className="muted wishlist-create-hint">
                  The current product will be saved to the new wishlist.
                </p>
                <div className="wishlist-modal-actions">
                  <UIButton variant="secondary" size="s"
                    disabled={creatingWishlist}
                    onClick={() => setShowCreateForm(false)}
                    type="button"
                  >
                    Cancel
                  </UIButton>
                  <UIButton variant="primary"

                    disabled={creatingWishlist || !newWishlistName.trim()}
                    type="submit"
                  >
                    {creatingWishlist ? "Creating…" : "Create and save"}
                  </UIButton>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="wishlist-picker-list">
                {wishlists.map((wishlist) => {
                  const saved = Boolean(
                    matchingLine(wishlist, productId, variantId),
                  );
                  return (
                    <UIButton variant={saved ? "primary" : "secondary"} size="s"
                      aria-pressed={saved}
                      className={`wishlist-picker-option${saved ? " saved" : ""}`}
                      disabled={pendingWishlistId !== null}
                      key={wishlist.id}
                      onClick={() => toggleList(wishlist)}
                      type="button"
                    >
                      <span>
                        <strong>{wishlist.name}</strong>
                        {wishlist.isDefault && <small>Default</small>}
                      </span>
                      <span className="wishlist-picker-count">
                        {pendingWishlistId === wishlist.id
                          ? "Updating…"
                          : `${wishlist.lines.length} item${
                              wishlist.lines.length === 1 ? "" : "s"
                            }`}
                        {saved && (
                          <FontAwesomeIcon aria-hidden="true" icon={faCheck} />
                        )}
                      </span>
                    </UIButton>
                  );
                })}
              </div>
              <div className="wishlist-picker-footer">
                <UIButton variant="ghost" size="fit"
                  className="text-button wishlist-create-trigger"
                  onClick={() => setShowCreateForm(true)}
                  type="button"
                >
                  <FontAwesomeIcon aria-hidden="true" icon={faPlus} />
                  Create new wishlist
                </UIButton>
                <Link
                  className="wishlist-manage-link"
                  href="/account/wishlists"
                  onClick={closePicker}
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
