import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export default function CookiePolicyPage() {
  return (
    <LegalDocumentPage
      type="cookie"
      pageTitle="Cookie notice."
      introduction={
        "See how essential cookies and browser storage support " +
        "authentication, preferences and platform security."
      }
    />
  );
}