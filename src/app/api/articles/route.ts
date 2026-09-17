import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Article } from "@/lib/models/Article";

export async function GET() {
  await connectDB();
  const articles = await Article.find().sort({ publishedAt: -1 }).lean();

  return NextResponse.json(
    articles.map((article) => ({
      id: String(article._id),
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      coverImage: article.coverImage ?? null,
      publishedAt: article.publishedAt.toISOString(),
    })),
  );
}
