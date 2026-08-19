"use client";

import { useState } from "react";
import { Download, KeyRound, MailCheck, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-errors";
import { formatDate, titleCase } from "@/lib/formatters";
import { accountService } from "@/services/account-service";
import { authService } from "@/services/auth-service";
import shared from "@/components/dashboard/DashboardPage.module.css";
import styles from "./page.module.css";

export default function AccountPage() {
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const requestVerification = async () => {
    setVerificationBusy(true);
    try {
      const result = await accountService.requestEmailVerification();
      toast.success(result.message);
      await refreshProfile();
    } catch (reason) { toast.error(getApiErrorMessage(reason)); }
    finally { setVerificationBusy(false); }
  };

  const exportData = async () => {
    setBusy("export");
    try {
      const data = await accountService.exportData(exportPassword);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `homelink-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportPassword("");
      toast.success("Your account export is ready.");
    } catch (reason) { toast.error(getApiErrorMessage(reason)); }
    finally { setBusy(null); }
  };

  const changePassword = async () => {
    setBusy("password");
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      toast.success(result.message);
      await logout().catch(() => undefined);
      router.replace("/login");
    } catch (reason) { toast.error(getApiErrorMessage(reason)); }
    finally { setBusy(null); }
  };

  const deleteAccount = async () => {
    if (deleteText !== "DELETE") {
      toast.error("Type DELETE to confirm account deletion.");
      return;
    }
    setBusy("delete");
    try {
      await accountService.deleteAccount(deletePassword);
      await logout().catch(() => undefined);
      toast.success("Your account has been deleted.");
      router.replace("/");
    } catch (reason) { toast.error(getApiErrorMessage(reason)); }
    finally { setBusy(null); }
  };

  return (
    <div className={shared.page}>
      <header className={shared.pageHeader}><div><span className={shared.eyebrow}><User aria-hidden="true" />Profile and privacy</span><h1>Account settings.</h1><p>Review your identity, improve account security and control your HomeLink data.</p></div></header>

      <section className={styles.profileCard}>
        <div><span>Full name</span><strong>{user?.full_name}</strong></div>
        <div><span>Email</span><strong>{user?.email}</strong></div>
        <div><span>Phone</span><strong>{user?.phone}</strong></div>
        <div><span>Role</span><strong>{titleCase(user?.role ?? "user")}</strong></div>
        <div><span>Member since</span><strong>{formatDate(user?.created_at)}</strong></div>
        <div><span>Email status</span><strong>{user?.is_email_verified ? "Verified" : "Not verified"}</strong></div>
      </section>

      {!user?.is_email_verified ? (
        <section className={styles.sectionCard}>
          <span className={styles.sectionIcon}><MailCheck aria-hidden="true" /></span>
          <div><h2>Verify your email</h2><p>Request a secure verification link. During local development, the link is printed in the FastAPI terminal.</p></div>
          <button type="button" className={shared.secondaryButton} disabled={verificationBusy} onClick={() => void requestVerification()}>{verificationBusy ? "Sending…" : "Send verification link"}</button>
        </section>
      ) : null}

      <section className={styles.formGrid}>
        <article className={styles.formCard}>
          <span className={styles.sectionIcon}><KeyRound aria-hidden="true" /></span><h2>Change password</h2><p>You will be signed out after a successful password change.</p>
          <label><span>Current password</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label>
          <label><span>New password</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={10} /></label>
          <button type="button" className={shared.primaryButton} disabled={busy === "password" || !currentPassword || newPassword.length < 10} onClick={() => void changePassword()}>{busy === "password" ? "Updating…" : "Update password"}</button>
        </article>

        <article className={styles.formCard}>
          <span className={styles.sectionIcon}><Download aria-hidden="true" /></span><h2>Export your data</h2><p>Download a JSON record of your HomeLink account and associated activity.</p>
          <label><span>Confirm current password</span><input type="password" value={exportPassword} onChange={(event) => setExportPassword(event.target.value)} autoComplete="current-password" /></label>
          <button type="button" className={shared.secondaryButton} disabled={busy === "export" || !exportPassword} onClick={() => void exportData()}>{busy === "export" ? "Preparing…" : "Download export"}</button>
        </article>
      </section>

      <section className={styles.dangerZone}>
        <span className={styles.sectionIcon}><Trash2 aria-hidden="true" /></span>
        <div><h2>Delete account</h2><p>This anonymises your account and ends active sessions. This action cannot be reversed.</p></div>
        <div className={styles.deleteFields}><input type="password" placeholder="Current password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /><input type="text" placeholder="Type DELETE" value={deleteText} onChange={(event) => setDeleteText(event.target.value)} /></div>
        <button type="button" className={shared.dangerButton} disabled={busy === "delete" || !deletePassword || deleteText !== "DELETE"} onClick={() => void deleteAccount()}>{busy === "delete" ? "Deleting…" : "Delete account"}</button>
      </section>
    </div>
  );
}