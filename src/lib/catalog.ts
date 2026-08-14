import { resolveProductImage, type Product } from "@/data/products";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

// Raw product row joined with category, plus admin-only fields.
export interface ProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  seed_key: string | null;
  available: boolean;
  category_id: string | null;
  sort_order: number;
  category: string;
  image: string;
  minimum_order_quantity: number;
  maximum_order_quantity?: number | null;
}

export const FALLBACK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "فواكه طازجة", sort_order: 1 },
  { id: "cat-2", name: "تمور فاخرة", sort_order: 2 },
  { id: "cat-3", name: "مكسرات ومكملات", sort_order: 3 },
];

export const FALLBACK_PRODUCTS: ProductRow[] = [
  {
    id: "p-1",
    name: "تين أحمر فاخر (صندوق 1 كجم)",
    description: "تين أحمر طازج من مزارع ليوا الممتازة، مقطوف بنفس اليوم.",
    price: 85,
    image_url: null,
    seed_key: "red-fig",
    available: true,
    category_id: "cat-1",
    sort_order: 1,
    category: "فواكه طازجة",
    image: resolveProductImage({ seed_key: "red-fig" }),
    minimum_order_quantity: 1,
  },
  {
    id: "p-2",
    name: "تين أصفر (صندوق 1 كجم)",
    description: "تين أصفر حلو ولذيذ من أفضل المحاصيل الطازجة.",
    price: 80,
    image_url: null,
    seed_key: "yellow-fig",
    available: true,
    category_id: "cat-1",
    sort_order: 2,
    category: "فواكه طازجة",
    image: resolveProductImage({ seed_key: "yellow-fig" }),
    minimum_order_quantity: 1,
  },
  {
    id: "p-3",
    name: "تمر مجدول فاخر (1 كجم)",
    description: "تمور فاخرة عالية الجودة مختارة بعناية.",
    price: 95,
    image_url: null,
    seed_key: "dates",
    available: true,
    category_id: "cat-2",
    sort_order: 3,
    category: "تمور فاخرة",
    image: resolveProductImage({ seed_key: "dates" }),
    minimum_order_quantity: 1,
  },
  {
    id: "p-4",
    name: "توت أسود بلدي (علبة)",
    description: "توت طازج وغني بالفيتامينات وطعم استثنائي.",
    price: 60,
    image_url: null,
    seed_key: "mulberry",
    available: true,
    category_id: "cat-1",
    sort_order: 4,
    category: "فواكه طازجة",
    image: resolveProductImage({ seed_key: "mulberry" }),
    minimum_order_quantity: 1,
  },
  {
    id: "p-5",
    name: "صبار حلو (تين شوكي - 1 كجم)",
    description: "ثمار التين الشوكي الطازجة والمقشرة بعناية.",
    price: 50,
    image_url: null,
    seed_key: "cactus",
    available: true,
    category_id: "cat-1",
    sort_order: 5,
    category: "فواكه طازجة",
    image: resolveProductImage({ seed_key: "cactus" }),
    minimum_order_quantity: 1,
  },
  {
    id: "p-6",
    name: "فقع بلدي طازج (كمأة - 1 كجم)",
    description: "فقع كمأة صحراوي طازج عالي الجودة.",
    price: 250,
    image_url: null,
    seed_key: "truffle",
    available: true,
    category_id: "cat-3",
    sort_order: 6,
    category: "مكسرات ومكملات",
    image: resolveProductImage({ seed_key: "truffle" }),
    minimum_order_quantity: 1,
  },
  {
    id: "p-7",
    name: "لوز أخضر طازج (1 كجم)",
    description: "لوز أخضر طازج ومقرمش من محاصيل الموسم.",
    price: 70,
    image_url: null,
    seed_key: "almonds",
    available: true,
    category_id: "cat-3",
    sort_order: 7,
    category: "مكسرات ومكملات",
    image: resolveProductImage({ seed_key: "almonds" }),
    minimum_order_quantity: 1,
  },
];

const CAT_STORAGE_KEY = "d1_categories_store";
const PROD_STORAGE_KEY = "d1_products_store";

export async function fetchCategories(): Promise<Category[]> {
  if (typeof window === "undefined") return FALLBACK_CATEGORIES;
  try {
    const raw = localStorage.getItem(CAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(FALLBACK_CATEGORIES));
  return FALLBACK_CATEGORIES;
}

export async function fetchProducts(): Promise<ProductRow[]> {
  if (typeof window === "undefined") return FALLBACK_PRODUCTS;
  try {
    const raw = localStorage.getItem(PROD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  localStorage.setItem(PROD_STORAGE_KEY, JSON.stringify(FALLBACK_PRODUCTS));
  return FALLBACK_PRODUCTS;
}

// Maps a product row to the unified Product shape used by the storefront/cart.
export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image || resolveProductImage({ image_url: row.image_url, seed_key: row.seed_key }),
    category: row.category,
    available: row.available,
    minimum_order_quantity: row.minimum_order_quantity || 1,
    maximum_order_quantity: row.maximum_order_quantity ?? null,
  };
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  available: boolean;
  category_id: string | null;
  sort_order: number;
  minimum_order_quantity: number;
  maximum_order_quantity?: number | null;
}

export async function createProduct(input: ProductInput) {
  const products = await fetchProducts();
  const categories = await fetchCategories();
  const cat = categories.find((c) => c.id === input.category_id);
  const newProduct: ProductRow = {
    id: `prod_${Date.now()}`,
    name: input.name,
    description: input.description || "",
    price: Number(input.price),
    image_url: input.image_url,
    seed_key: null,
    available: input.available,
    category_id: input.category_id,
    sort_order: input.sort_order || products.length + 1,
    category: cat?.name || "بدون صنف",
    image: input.image_url || resolveProductImage({ seed_key: "red-fig" }),
    minimum_order_quantity: input.minimum_order_quantity || 1,
    maximum_order_quantity: input.maximum_order_quantity
      ? Number(input.maximum_order_quantity)
      : null,
  };
  products.push(newProduct);
  localStorage.setItem(PROD_STORAGE_KEY, JSON.stringify(products));
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const products = await fetchProducts();
  const categories = await fetchCategories();
  const index = products.findIndex((p) => p.id === id);
  if (index >= 0) {
    const existing = products[index];
    const cat = categories.find(
      (c) => c.id === (input.category_id !== undefined ? input.category_id : existing.category_id),
    );
    products[index] = {
      ...existing,
      ...input,
      category: cat ? cat.name : existing.category,
      image: input.image_url !== undefined ? input.image_url || existing.image : existing.image,
    };
    localStorage.setItem(PROD_STORAGE_KEY, JSON.stringify(products));
  }
}

export async function deleteProduct(id: string) {
  const products = await fetchProducts();
  const filtered = products.filter((p) => p.id !== id);
  localStorage.setItem(PROD_STORAGE_KEY, JSON.stringify(filtered));
}

export async function createCategory(name: string, sort_order: number) {
  const categories = await fetchCategories();
  const newCat: Category = {
    id: `cat_${Date.now()}`,
    name,
    sort_order: sort_order || categories.length + 1,
  };
  categories.push(newCat);
  localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories));
}

export async function updateCategory(id: string, fields: { name?: string; sort_order?: number }) {
  const categories = await fetchCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index >= 0) {
    categories[index] = { ...categories[index], ...fields };
    localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories));
  }
}

export async function deleteCategory(id: string) {
  const categories = await fetchCategories();
  const filtered = categories.filter((c) => c.id !== id);
  localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(filtered));
}

// Convert image file to Data URL for instant persistent local/D1 preview
export async function uploadProductImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

// Delivery zones removed — flat fee per emirate. See @/lib/emirates.
