"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { sendMessage } from "@/server/messages";

interface ChatInputProps {
  roomId: string;
}

export function ChatInput({ roomId }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isPending) {
      return;
    }

    const messageContent = message.trim();
    setMessage("");

    startTransition(async () => {
      try {
        await sendMessage(roomId, messageContent);
      } catch (error) {
        console.error("Failed to send message:", error);
        // Restore message on error
        setMessage(messageContent);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your availability... (Press Enter to send, Shift+Enter for new line)"
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="h-[60px] w-[60px]"
          disabled={!message.trim() || isPending}
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
