import { getRoomById } from "@/server/rooms";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chat, ChatMessage } from "@/components/chat";

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage(props: ChatPageProps) {
  const params = await props.params;
  const room = await getRoomById(params.id);

  if (!room) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Mocked messages from test examples (Test Case 1: Mixed Languages)
  const mockedMessages: ChatMessage[] = [
    {
      id: "msg_1",
      content: "Mogę rano 9-11 i po 15:00",
      role: "user",
      createdAt: new Date("2025-02-08T10:00:00.000Z"),
      user: {
        id: "user_1",
        name: "Marek",
        email: "marek@example.com",
        image: "https://example.com/marek.jpg",
      },
    },
    {
      id: "msg_2",
      content: "I'm available from 10am to 4pm",
      role: "user",
      createdAt: new Date("2025-02-08T10:15:00.000Z"),
      user: {
        id: "user_2",
        name: "Sarah",
        email: "sarah@example.com",
        image: "https://example.com/sarah.jpg",
      },
    },
  ];

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
              Invite Code
            </h3>
            <code className="bg-muted px-3 py-1 rounded text-sm">
              {room.inviteCode}
            </code>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Chat messages={mockedMessages} currentUserId="user_1" />
      </div>
    </div>
  );
}
