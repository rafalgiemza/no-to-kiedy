"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./types";
import { ChatInput } from "./chat-input";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, Clock } from "lucide-react";
import { analyzeAvailability } from "@/server/analysis";

interface TimeSlot {
  start: string;
  end: string;
}

interface AnalysisResult {
  commonSlots: TimeSlot[];
  participantsCount: number;
  meetingDuration: number;
}

interface ChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  roomId: string;
  ownerId: string;
  initialAnalysisResult?: AnalysisResult | null;
}

export function Chat({
  messages,
  currentUserId,
  roomId,
  ownerId,
  initialAnalysisResult,
}: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    initialAnalysisResult || null
  );

  // Check if current user is the owner
  const isOwner = currentUserId === ownerId;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleFindTime = () => {
    startTransition(async () => {
      try {
        const result = await analyzeAvailability(roomId);
        console.log("Analysis result:", result);

        if (result.success && result.data) {
          setAnalysisResult({
            commonSlots: result.data.commonSlots,
            participantsCount: result.data.participantsCount,
            meetingDuration: result.data.meetingDuration,
          });
        } else {
          setAnalysisResult(null);
        }
      } catch (error) {
        console.error("Failed to analyze availability:", error);
        setAnalysisResult(null);
      }
    });
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("pl-PL", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isCurrentUser = message.user?.id === currentUserId;
            const isAssistant = message.role === "assistant";
            const isSystem = message.role === "system";

            if (isSystem) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                    {message.content}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  isCurrentUser && "flex-row-reverse"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.user?.image || undefined} />
                  <AvatarFallback>
                    {message.user?.name ? getInitials(message.user.name) : "?"}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    "flex flex-col gap-1 max-w-[70%]",
                    isCurrentUser && "items-end"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {message.user?.name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg px-4 py-2",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : isAssistant
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {isOwner && (
        <div className="px-4 pt-3 border-t space-y-3">
          <Button
            onClick={handleFindTime}
            disabled={isPending}
            className="w-full"
            variant="default"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isPending ? "Analyzing..." : "Find Time"}
          </Button>

          {analysisResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {analysisResult.commonSlots.length > 0
                    ? `Found ${analysisResult.commonSlots.length} common ${
                        analysisResult.commonSlots.length === 1 ? "slot" : "slots"
                      }`
                    : "No common slots found"}
                </span>
                <span>{analysisResult.participantsCount} participants</span>
              </div>

              {analysisResult.commonSlots.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysisResult.commonSlots.slice(0, 3).map((slot, index) => (
                    <div
                      key={index}
                      className="bg-secondary/50 rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateTime(slot.start)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Duration: {calculateDuration(slot.start, slot.end)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ends: {formatDateTime(slot.end)}
                      </div>
                    </div>
                  ))}
                  {analysisResult.commonSlots.length > 3 && (
                    <div className="text-xs text-center text-muted-foreground">
                      +{analysisResult.commonSlots.length - 3} more slots
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground text-center">
                  No common availability found for all participants. Try
                  extending the search timeframe or adjusting meeting duration.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ChatInput roomId={roomId} />
    </Card>
  );
}
