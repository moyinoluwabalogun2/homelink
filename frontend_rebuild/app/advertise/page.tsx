import type {
  Metadata,
} from "next";

import AdvertiseClient
  from "@/components/advertising/AdvertiseClient";


export const metadata:
  Metadata = {
  title:
    "Advertise Your Business | HomeLink",

  description:
    "Promote your business across HomeLink for seven days with a sponsored placement.",
};


export default function AdvertisePage() {
  return <AdvertiseClient />;
}