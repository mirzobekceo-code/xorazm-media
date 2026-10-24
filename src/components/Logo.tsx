import Link from "next/link";

/** Adverto uslubidagi belgi: qalin halqa va markazda nuqta. */
export default function Logo() {
  return (
    <Link className="brand" href="/" aria-label="Xorazm Digital HUB — bosh sahifa">
      <span className="mark" aria-hidden="true" />
      <span>Xorazm Digital <span className="hub">HUB</span></span>
    </Link>
  );
}
