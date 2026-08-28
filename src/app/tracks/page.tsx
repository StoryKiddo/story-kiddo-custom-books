import { permanentRedirect } from "next/navigation";

/** Old URL — send visitors to /themes so bookmarks and in-app links still work. */
export default function TracksRedirectPage() {
  permanentRedirect("/themes");
}
