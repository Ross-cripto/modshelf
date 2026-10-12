"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
export function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState("idle");
  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }
  return (
    <>
      <button type="button" className="copy-button" onClick={copyText}>
        {status === "copied" ? <Check size={15} /> : <Copy size={15} />}
        <span>{status === "copied" ? "Copied" : "Copy"}</span>
      </button>
      {status === "error" ? (
        <span className="copy-error" role="status">
          Select and copy the commands below.
        </span>
      ) : null}
    </>
  );
}
