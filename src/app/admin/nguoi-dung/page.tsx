import { getUsers } from "@/lib/admin/users";
import { UsersContent } from "@/components/admin/UsersContent";

export default async function AdminUsersPage() {
  const users = await getUsers();
  return <UsersContent initialUsers={users} />;
}
