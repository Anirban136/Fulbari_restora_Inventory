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

interface VendorInfo {
  id: string
  name: string
}

export function BulkStockManager({ items, categories, vendors = [], outlets = [] }: { items: CatalogItem[], categories: string[], vendors?: VendorInfo[], outlets?: any[] }) {
  return <ManualBulkEntry existingItems={items} existingCategories={categories} existingVendors={vendors} outlets={outlets} />
}
