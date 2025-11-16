import { getRoomById, joinRoomAsParticipant } from "@/server/rooms";
import { getMessagesByRoomId } from "@/server/messages";
import { getCurrentUser } from "@/server/users";
import { getLatestAnalysisResults } from "@/server/analysis";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chat, ChatMessage } from "@/components/chat";
import { InviteCodeCopy } from "@/components/invite-code-copy";
import { generateAllCalendarLinks } from "@/utils/calendar-links";

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage(props: ChatPageProps) {
  const params = await props.params;
  let room = await getRoomById(params.id);

  if (!room) {
    notFound();
  }

  const { currentUser } = await getCurrentUser();

  // Auto-join user to room if not already a participant
  await joinRoomAsParticipant(params.id);

  // Refresh room data to get updated participants list
  room = await getRoomById(params.id);

  if (!room) {
    notFound();
  }

  const messages = await getMessagesByRoomId(params.id);

  // Get latest analysis results if available
  const latestAnalysis = await getLatestAnalysisResults(params.id);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Transform database messages to ChatMessage format
  const chatMessages: ChatMessage[] = messages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    role: msg.role,
    createdAt: msg.createdAt,
    user: msg.user
      ? {
          id: msg.user.id,
          name: msg.user.name,
          email: msg.user.email,
          image: msg.user.image,
        }
      : null,
  }));

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{room.title}</CardTitle>
            <Badge variant={room.status === "active" ? "default" : "secondary"}>
              {room.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">
                Meeting Duration
              </h3>
              <p className="text-lg">{room.meetingDuration} minutes</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">
                Organizer
              </h3>
              <p className="text-lg">{room.owner.name}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              Search Timeframe
            </h3>
            <div className="space-y-1">
              <p>
                <span className="font-medium">From:</span>{" "}
                {formatDate(room.searchTimeframeStart)}
              </p>
              <p>
                <span className="font-medium">Until:</span>{" "}
                {formatDate(room.searchTimeframeEnd)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              Participants ({room.participants.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {room.participants.map((participant) => (
                <Badge key={participant.id} variant="outline">
                  {participant.user.name}
                  {participant.role === "owner" && " (Organizer)"}
                </Badge>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              Invite Link
            </h3>
            <InviteCodeCopy inviteCode={room.inviteCode} roomId={params.id} />
          </div>

          {room.status === "completed" &&
            room.finalizedSlotStart &&
            room.finalizedSlotEnd &&
            (() => {
              const calendarLinks = generateAllCalendarLinks({
                title: room.title || "Meeting",
                startTime: room.finalizedSlotStart,
                endTime: room.finalizedSlotEnd,
                description: "Meeting scheduled via No to kiedy",
              });

              return (
                <div className="pt-4 border-t bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Meeting Finalized
                  </h3>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Start:</span>{" "}
                      {formatDate(room.finalizedSlotStart)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">End:</span>{" "}
                      {formatDate(room.finalizedSlotEnd)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Add to Calendar:
                    </p>
                    <div className="flex flex-col gap-2">
                      <a
                        href={calendarLinks.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 h-10 px-4 py-2"
                      >
                        <svg
                          className="h-4 w-4 mr-2"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M19.5 3H4.5C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zm0 15h-15v-13h15v13z" />
                        </svg>
                        Google Calendar
                      </a>
                      <a
                        href={calendarLinks.outlook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 h-10 px-4 py-2"
                      >
                        <svg
                          className="h-4 w-4 mr-2"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M7 2H17C18.1046 2 19 2.89543 19 4V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V4C5 2.89543 5.89543 2 7 2Z" />
                        </svg>
                        Outlook Calendar
                      </a>
                      <a
                        href={calendarLinks.office365}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 h-10 px-4 py-2"
                      >
                        <svg
                          className="h-4 w-4 mr-2"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3Z" />
                        </svg>
                        Office 365
                      </a>
                      {room.icsFileUrl && (
                        <a
                          href={room.icsFileUrl}
                          download="invite.ics"
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 h-10 px-4 py-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Download .ics (Apple Calendar, etc.)
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Chat
          messages={chatMessages}
          currentUserId={currentUser.id}
          roomId={params.id}
          ownerId={room.ownerId}
          initialAnalysisResult={latestAnalysis}
          roomStatus={room.status}
        />
      </div>
    </div>
  );
}
