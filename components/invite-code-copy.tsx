"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

interface InviteCodeCopyProps {
  inviteCode: string;
  roomId: string;
}

export function InviteCodeCopy({ inviteCode, roomId }: InviteCodeCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Construct the full invite link
      const inviteLink = `${window.location.origin}/chat/${roomId}`;

      await navigator.clipboard.writeText(inviteLink);

      setCopied(true);
      toast.success("Invite link copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy invite link");
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="bg-muted px-3 py-1 rounded text-sm flex-1">
        {inviteCode}
      </code>
      <button
        onClick={handleCopy}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3"
        aria-label="Copy invite link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
