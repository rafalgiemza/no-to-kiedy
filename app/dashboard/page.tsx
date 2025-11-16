import { getMyRooms } from "@/server/rooms";
import { getCurrentUser } from "@/server/users";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const chatRooms = await getMyRooms();
  const { currentUser } = await getCurrentUser();

  return <DashboardView chatRooms={chatRooms} currentUserId={currentUser.id} />;
}
