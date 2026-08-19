import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export default function TermsPage() {
  return (
    <LegalDocumentPage
      type="terms"
      pageTitle="Terms of service."
      introduction={
        "Read the platform rules, listing responsibilities, payment " +
        "conditions and safety expectations that apply when using HomeLink."
      }
    />
  );
}