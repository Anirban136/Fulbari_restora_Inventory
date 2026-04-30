"use client"

import { ManualBulkEntry } from "./ManualBulkEntry"

interface CatalogItem {
  id: string
  name: string
  category: string | null
  unit: string | null
  currentStock: number | null
  costPerUnit: number | null
  sellPrice: number | null
  piecesPerBox: number | null
}

export function BulkStockManager({ items, categories }: { items: CatalogItem[], categories: string[] }) {
  return <ManualBulkEntry existingItems={items} existingCategories={categories} />
}
