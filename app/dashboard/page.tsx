import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { CreateRoomForm } from "@/components/forms/create-room-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getOrganizations } from "@/server/organizations";
import Link from "next/link";

export default async function Dashboard() {
  const organizations = await getOrganizations();

  return (
    <div className="flex flex-col gap-4 items-center justify-center h-screen">
      <div className="flex gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Create Organization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to get started.
              </DialogDescription>
            </DialogHeader>
            <CreateOrganizationForm />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Chat Room</Button>
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

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Organizations</h2>
        {organizations.map((organization) => (
          <Button variant="outline" key={organization.id} asChild>
            <Link href={`/dashboard/organization/${organization.slug}`}>
              {organization.name}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
