import { Suspense } from "react";

import PaymentCallbackClient from "@/components/payments/PaymentCallbackClient";

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCallbackClient />
    </Suspense>
  );
}