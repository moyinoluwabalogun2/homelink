import type {
  Metadata,
} from "next";

import AdvertisementManager
  from "@/components/advertising/AdvertisementManager";


export const metadata:
  Metadata = {
  title:
    "Manage Advertisement | HomeLink",

  description:
    "Privately manage your HomeLink sponsored advertisement.",
};


export default function AdvertisementManagePage() {
  return <AdvertisementManager />;
}