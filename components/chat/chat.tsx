"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./types";
import { ChatInput } from "./chat-input";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Calendar,
  Clock,
  Check,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  analyzeAvailability,
  finalizeTimeSlot,
  getLatestAnalysisResults,
} from "@/server/analysis";
import { toast } from "sonner";

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  isSelected: boolean;
  isPartialMatch?: boolean;
  matchingParticipantsCount?: number;
  totalParticipantsCount?: number;
}

interface AnalysisResult {
  commonSlots: TimeSlot[];
  participantsCount: number;
  meetingDuration: number;
  status?:
    | "error"
    | "success"
    | "partial_success"
    | "no_slots_found"
    | "processing";
}

interface ChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  roomId: string;
  ownerId: string;
  initialAnalysisResult?: AnalysisResult | null;
  roomStatus?: "active" | "completed" | "archived";
}

export function Chat({
  messages,
  currentUserId,
  roomId,
  ownerId,
  initialAnalysisResult,
  roomStatus = "active",
}: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    initialAnalysisResult || null
  );
  const [error, setError] = useState<{
    message: string;
    retryCount: number;
    canRetry: boolean;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check if current user is the owner
  const isOwner = currentUserId === ownerId;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleFindTime = (currentRetryCount: number = 0) => {
    startTransition(async () => {
      try {
        // Clear previous error when retrying
        setError(null);

        const result = await analyzeAvailability(roomId, currentRetryCount);
        console.log("Analysis result:", result);

        if (result.success) {
          // Fetch the latest analysis results with proposal IDs
          const latestAnalysis = await getLatestAnalysisResults(roomId);

          if (latestAnalysis) {
            setAnalysisResult(latestAnalysis);
            setError(null);
            setRetryCount(0); // Reset retry count on success
          } else {
            setAnalysisResult(null);
          }
        } else {
          // US-011: Handle system error
          setAnalysisResult(null);
          setError({
            message: result.error || "Unknown error occurred",
            retryCount: result.retryCount || 0,
            canRetry: result.canRetry || false,
          });
          setRetryCount(result.retryCount || 0);
          toast.error("Analysis failed: " + (result.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Failed to analyze availability:", error);
        setAnalysisResult(null);
        setError({
          message: (error as Error).message,
          retryCount: currentRetryCount,
          canRetry: currentRetryCount < 3,
        });
        toast.error("Failed to analyze availability");
      }
    });
  };

  const handleRetry = () => {
    const nextRetryCount = retryCount + 1;
    setRetryCount(nextRetryCount);
    handleFindTime(nextRetryCount);
  };

  const handleAcceptSlot = (proposalId: string) => {
    startTransition(async () => {
      try {
        const result = await finalizeTimeSlot(roomId, proposalId);
        console.log("Finalization result:", result);

        if (result.success) {
          toast.success("Meeting finalized! Refreshing...");
          // Refresh the page to show completed state
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          toast.error("Failed to finalize meeting");
        }
      } catch (error) {
        console.error("Failed to finalize time slot:", error);
        toast.error("Failed to finalize meeting");
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
      <Tabs defaultValue="chat" className="flex flex-col h-full">
        <TabsList className="mx-4 mt-4 w-auto">
          <TabsTrigger className="cursor-pointer" value="chat">
            Chat
          </TabsTrigger>
          {isOwner && roomStatus === "active" && (
            <TabsTrigger className="cursor-pointer" value="ai">
              AI
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          value="chat"
          className="flex-1 flex flex-col mt-0 overflow-hidden"
        >
          <ScrollArea className="flex-1 p-4 overflow-y-auto">
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
                        {message.user?.name
                          ? getInitials(message.user.name)
                          : "?"}
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

          {roomStatus === "active" && <ChatInput roomId={roomId} />}

          {roomStatus === "completed" && (
            <div className="px-4 py-3 border-t bg-muted/50 text-center text-sm text-muted-foreground">
              This room is completed and read-only
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="ai"
          className="flex-1 flex flex-col mt-0 overflow-hidden"
        >
          {isOwner && roomStatus === "active" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-3 space-y-3 flex-1 overflow-y-auto">
                <Button
                  onClick={() => handleFindTime()}
                  disabled={isPending}
                  className="w-full cursor-pointer"
                  variant="default"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isPending ? "Analyzing..." : "Find Time"}
                </Button>

                {/* US-011: System Error Display */}
                {error && (
                  <div className="space-y-2">
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-destructive mb-1">
                            System Error
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {error.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-destructive/20">
                        <span className="text-xs text-muted-foreground">
                          Attempt {error.retryCount + 1} of 3
                        </span>
                        {error.canRetry && (
                          <Button
                            onClick={handleRetry}
                            disabled={isPending}
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                          >
                            {isPending ? "Retrying..." : "Try Again"}
                          </Button>
                        )}
                        {!error.canRetry && (
                          <span className="text-xs text-destructive font-medium">
                            Max retries reached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {analysisResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {analysisResult.commonSlots.length > 0
                          ? `Found ${
                              analysisResult.commonSlots.length
                            } common ${
                              analysisResult.commonSlots.length === 1
                                ? "slot"
                                : "slots"
                            }`
                          : "No common slots found"}
                      </span>
                      <span>
                        {analysisResult.participantsCount} participants
                      </span>
                    </div>

                    {/* US-012: Partial Match Warning */}
                    {analysisResult.status === "partial_success" &&
                      analysisResult.commonSlots.length > 0 &&
                      analysisResult.commonSlots[0].isPartialMatch && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                              ⚠️ Znaleziono termin dla{" "}
                              {
                                analysisResult.commonSlots[0]
                                  .matchingParticipantsCount
                              }{" "}
                              z{" "}
                              {
                                analysisResult.commonSlots[0]
                                  .totalParticipantsCount
                              }{" "}
                              uczestników
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                              Nie wszyscy uczestnicy są dostępni w proponowanych
                              terminach
                            </p>
                          </div>
                        </div>
                      )}

                    {analysisResult.commonSlots.length > 0 ? (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {analysisResult.commonSlots.slice(0, 3).map((slot) => (
                          <div
                            key={slot.id}
                            className="bg-secondary/50 rounded-lg p-3 space-y-2"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDateTime(slot.start)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                Duration:{" "}
                                {calculateDuration(slot.start, slot.end)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Ends: {formatDateTime(slot.end)}
                            </div>
                            {/* US-012: Show participant count for partial matches */}
                            {slot.isPartialMatch && (
                              <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" />
                                <span>
                                  {slot.matchingParticipantsCount}/
                                  {slot.totalParticipantsCount} uczestników
                                </span>
                              </div>
                            )}
                            <Button
                              onClick={() => handleAcceptSlot(slot.id)}
                              disabled={isPending || slot.isSelected}
                              className="w-full mt-2 cursor-pointer"
                              size="sm"
                              variant={slot.isSelected ? "outline" : "default"}
                            >
                              {slot.isSelected ? (
                                <>
                                  <Check className="h-3 w-3 mr-2" />
                                  Selected
                                </>
                              ) : (
                                "Accept"
                              )}
                            </Button>
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
                        extending the search timeframe or adjusting meeting
                        duration.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                {roomStatus === "completed"
                  ? "This room is completed"
                  : "AI features are available only for the room owner"}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
