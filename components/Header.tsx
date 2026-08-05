import Link from "next/link";
export function Header() {
  return (
    <>
      <header className="header shell">
        <Link className="brand" href="/">
          WORK<i>/</i>SHOP
        </Link>
        <nav className="nav">
          <Link href="/products">Catalog</Link>
          <Link href="/account">Account</Link>
          <Link className="pill" href="/cart">
            Cart →
          </Link>
        </nav>
      </header>
    </>
  );
}
