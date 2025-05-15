import { Metadata } from "next";
import NotificationsClient from "./notifications-client";

export const metadata: Metadata = {
  title: "Notifications | CateringHub",
  description: "View and manage your notifications",
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
