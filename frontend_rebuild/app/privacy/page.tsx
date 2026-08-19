import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      type="privacy"
      pageTitle="Privacy notice."
      introduction={
        "Understand what HomeLink processes, why it is needed, how long it " +
        "may be retained, and the choices available to users."
      }
    />
  );
}