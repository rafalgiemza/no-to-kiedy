"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Users,
  Crown,
  Plus,
  ExternalLink,
  Copy,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { getMyRooms } from "@/server/rooms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateRoomForm } from "@/components/forms/create-room-form";

// Typ danych pokoju na podstawie funkcji getMyRooms
type ChatRoom = Awaited<ReturnType<typeof getMyRooms>>[number];

interface Chat {
  id: string;
  title: string;
  ownerId: string;
  participants: string[];
  createdAt: Date;
  status: "active" | "complete";
  summary: string;
  foundAppointment: {
    date: Date;
    confirmed: boolean;
  } | null;
}

interface DashboardViewProps {
  chatRooms: ChatRoom[];
  currentUserId: string;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  chatRooms,
  currentUserId,
}) => {
  // Mapowanie danych z bazy na format wyświetlania
  const chats: Chat[] = chatRooms.map((room) => ({
    id: room.id,
    title: room.title || "Bez tytułu",
    ownerId: room.ownerId,
    participants: room.participants.map((p) => p.user.name),
    createdAt: room.createdAt,
    status: room.status === "completed" ? "complete" : "active",
    summary: `Spotkanie na ${room.meetingDuration} minut`,
    foundAppointment:
      room.finalizedSlotStart && room.finalizedSlotEnd
        ? {
            date: room.finalizedSlotStart,
            confirmed: true,
          }
        : null,
  }));
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (chatId: string) => {
    const url = `${window.location.origin}/chat/${chatId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(chatId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isOwner = (chat: Chat) => chat.ownerId === currentUserId;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Nagłówek z przyciskiem tworzenia */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Moje czaty</h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj swoimi rozmowami i spotkaniami
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-5 w-5" />
              Create Chat Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Chat Room</DialogTitle>
              <DialogDescription>
                Set up a new meeting room to find the best time for everyone.
              </DialogDescription>
            </DialogHeader>
            <CreateRoomForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid z czatami */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {chats.map((chat) => (
          <Card
            key={chat.id}
            className="border-border hover:shadow-lg transition-shadow duration-200"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2 pr-2">
                  {chat.title}
                </CardTitle>
                {isOwner(chat) && (
                  <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={chat.status === "active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {chat.status === "active" ? "Aktywny" : "Zakończony"}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{chat.participants.length}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Podsumowanie */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {chat.summary}
              </p>

              {/* Znaleziony termin */}
              {chat.foundAppointment && (
                <div className="bg-secondary/50 dark:bg-secondary/20 rounded-md p-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    <span>Następne spotkanie:</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(
                        chat.foundAppointment.date,
                        "dd MMM yyyy, HH:mm",
                        { locale: pl }
                      )}
                    </span>
                    {chat.foundAppointment.confirmed && (
                      <Badge variant="outline" className="text-xs py-0 px-1">
                        Potwierdzone
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Przyciski akcji */}
              <div className="flex gap-2 pt-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/chat/${chat.id}`}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Otwórz
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyLink(chat.id)}
                  className="flex-1 cursor-pointer"
                >
                  {copiedId === chat.id ? (
                    <>Skopiowano!</>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Kopiuj link
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Komunikat gdy brak czatów */}
      {chats.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Brak czatów
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              Nie masz jeszcze żadnych czatów. Rozpocznij nową rozmowę!
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Utwórz pierwszy czat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardView;
