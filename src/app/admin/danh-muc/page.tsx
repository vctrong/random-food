import { getCategories, getCategoryProposals } from "@/lib/admin/categories";
import { CategoriesContent } from "@/components/admin/CategoriesContent";

export default async function AdminCategoriesPage() {
  const [categories, proposals] = await Promise.all([getCategories(), getCategoryProposals()]);
  return <CategoriesContent initialCategories={categories} initialProposals={proposals} />;
}
