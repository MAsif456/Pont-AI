import { redirect } from "next/navigation";

// The app opens on the Dashboard (the caseload), matching the mockups.
export default function Home() {
  redirect("/cases");
}
