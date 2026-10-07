import { ProductStatus } from '../../domain/value-objects/product-status';

export interface ProductTopicItem {
  id: string;
  name: string;
  slug: string;
}

export interface ProductListItem {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  status: ProductStatus;
  upvotes: number;
  topics: ProductTopicItem[];
  review: { rating: number } | null;
}

export interface ProductDetail extends Omit<ProductListItem, 'review'> {
  longDescription: string | null;
  createdAt: Date;
  review: { rating: number; summary: string } | null;
}

export interface AdminProductListItem extends ProductListItem {
  createdAt: Date;
  updatedAt: Date;
}
