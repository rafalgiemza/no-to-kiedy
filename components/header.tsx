import { ArrowLeft, User } from "lucide-react";
import { Logout } from "./logout";
import { ModeSwitcher } from "./mode-switcher";
import { getCurrentUser } from "@/server/users";
import { Button } from "./ui/button";
import Link from "next/link";
// import { OrganizationSwitcher } from "./organization-switcher";
// import { getOrganizations } from "@/server/organizations";

export async function Header({
  showGoBackButton = false,
}: {
  showGoBackButton?: boolean;
}) {
  // const organizations = await getOrganizations();
  const { currentUser } = await getCurrentUser();

  return (
    <header className="absolute top-0 right-0 flex justify-between items-center p-4 w-full">
      {/* <OrganizationSwitcher organizations={organizations} /> */}
      {showGoBackButton && (
        <Link href={"/dashboard"} className="cursor-pointer">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Go back
          </Button>
        </Link>
      )}
      <div className="flex gap-2 items-center pl-2">
        <User /> {currentUser.name}
      </div>
      <div className="flex items-center gap-2">
        <ModeSwitcher />
        <Logout />
      </div>
    </header>
  );
}
