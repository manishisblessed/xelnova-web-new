import { products } from "@/lib/data/products";
import ProductDetail from "./product-detail";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default function ProductDetailPage() {
  return <ProductDetail />;
}
