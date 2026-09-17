import { Schema, model, models, type InferSchemaType } from "mongoose";

const articleSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  coverImage: { type: String },
  publishedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export type ArticleDocument = InferSchemaType<typeof articleSchema>;

export const Article = models.Article ?? model("Article", articleSchema);
