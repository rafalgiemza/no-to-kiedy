import { Logout } from "./logout";
import { ModeSwitcher } from "./mode-switcher";
import { getCurrentUser } from "@/server/users";
// import { OrganizationSwitcher } from "./organization-switcher";
// import { getOrganizations } from "@/server/organizations";

export async function Header() {
  // const organizations = await getOrganizations();
  const { currentUser } = await getCurrentUser();

  return (
    <header className="absolute top-0 right-0 flex justify-between items-center p-4 w-full">
      {/* <OrganizationSwitcher organizations={organizations} /> */}
      Zalogowany jako: {currentUser.name}
      <div className="flex items-center gap-2">
        <ModeSwitcher />
        <Logout />
      </div>
    </header>
  );
}
