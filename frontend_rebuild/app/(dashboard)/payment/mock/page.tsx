import { Suspense } from "react";

import MockPaymentClient from "@/components/payments/MockPaymentClient";

export default function MockPaymentPage() {
  return (
    <Suspense fallback={null}>
      <MockPaymentClient />
    </Suspense>
  );
}