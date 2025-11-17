"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createRoom } from "@/server/rooms";
import { NumberInput } from "../ui/number-input";

const formSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    meetingDuration: z
      .number()
      .min(15, "Duration must be at least 15 minutes")
      .max(480, "Duration cannot exceed 8 hours"),
    searchTimeframeStart: z.string().min(1, "Start date is required"),
    searchTimeframeEnd: z.string().min(1, "End date is required"),
  })
  .refine(
    (data) => {
      const start = new Date(data.searchTimeframeStart);
      const end = new Date(data.searchTimeframeEnd);
      return end > start;
    },
    {
      message: "End date must be after start date",
      path: ["searchTimeframeEnd"],
    }
  );

export function CreateRoomForm() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      meetingDuration: 60,
      searchTimeframeStart: "",
      searchTimeframeEnd: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      await createRoom({
        title: values.title,
        meetingDuration: values.meetingDuration,
        searchTimeframeStart: new Date(values.searchTimeframeStart),
        searchTimeframeEnd: new Date(values.searchTimeframeEnd),
      });
      toast.success("Chat room created successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create chat room");
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="Team Planning Meeting" {...field} />
              </FormControl>
              <FormDescription>What is this meeting about?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meetingDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Duration (minutes)</FormLabel>
              <FormControl>
                <NumberInput placeholder="60" min="15" max="480" {...field} />
              </FormControl>
              <FormDescription>
                How long should the meeting last? (15-480 minutes)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="searchTimeframeStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search From</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormDescription>
                Start of the time range to search for available slots
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="searchTimeframeEnd"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search Until</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormDescription>
                End of the time range to search for available slots
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button disabled={isLoading} type="submit" className="w-full">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Create Chat Room"
          )}
        </Button>
      </form>
    </Form>
  );
}
