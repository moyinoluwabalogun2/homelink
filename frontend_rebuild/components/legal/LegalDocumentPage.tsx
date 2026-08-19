"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, ShieldAlert } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api-errors";
import { legalService } from "@/services/legal-service";
import type { LegalDocument, LegalDocumentType } from "@/types/legal";

import styles from "./LegalDocumentPage.module.css";

interface LegalDocumentPageProps {
  type: LegalDocumentType;
  pageTitle: string;
  introduction: string;
}

type MarkdownBlock = {
  type: "heading-1" | "heading-2" | "heading-3" | "paragraph" | "quote";
  text: string;
};

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();

    if (text) {
      blocks.push({ type: "paragraph", text });
    }

    paragraph.length = 0;
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "heading-3", text: line.slice(4) });
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "heading-2", text: line.slice(3) });
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "heading-1", text: line.slice(2) });
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      blocks.push({ type: "quote", text: line.slice(2) });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

export default function LegalDocumentPage({
  type,
  pageTitle,
  introduction,
}: LegalDocumentPageProps) {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setDocument(await legalService.getDocument(type));
    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "This legal document could not be loaded.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  const blocks = useMemo(
    () => parseMarkdown(document?.content_markdown ?? ""),
    [document],
  );

  if (loading) {
    return (
      <div className={styles.state}>
        <Loader2 className={styles.spinner} aria-hidden="true" />
        <p>Loading HomeLink legal information…</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className={styles.state}>
        <ShieldAlert aria-hidden="true" />
        <p>{error || "This legal document is unavailable."}</p>
        <button type="button" className={styles.retry} onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          <FileText aria-hidden="true" />
          HomeLink policies
        </span>

        <h1>{pageTitle}</h1>
        <p>{introduction}</p>

        <div className={styles.meta}>
          <span>Version {document.version}</span>
          <span>Effective {document.effective_date}</span>
          {document.is_draft ? (
            <span className={styles.draft}>Draft — legal review required</span>
          ) : null}
        </div>
      </header>

      <article className={styles.document}>
        {blocks.map((block, index) => {
          const key = `${block.type}-${index}`;

          if (block.type === "heading-1") {
            return <h1 key={key}>{renderInline(block.text)}</h1>;
          }

          if (block.type === "heading-2") {
            return <h2 key={key}>{renderInline(block.text)}</h2>;
          }

          if (block.type === "heading-3") {
            return <h3 key={key}>{renderInline(block.text)}</h3>;
          }

          if (block.type === "quote") {
            return <blockquote key={key}>{renderInline(block.text)}</blockquote>;
          }

          return <p key={key}>{renderInline(block.text)}</p>;
        })}

        <div className={styles.contact}>
          <strong>Questions about this document?</strong>
          <a href={`mailto:${document.contact_email}`}>
            {document.contact_email}
          </a>
        </div>
      </article>
    </div>
  );
}