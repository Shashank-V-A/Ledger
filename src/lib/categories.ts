export const CATEGORIES = {
  food_ordering: {
    id: "food_ordering",
    label: "Ordering / Dining Out",
    color: "#f97316",
    isInvestment: false,
    keywords: [
      "zomato",
      "swiggy",
      "restaurant",
      "dining",
      "dining out",
      "order",
      "delivery",
      "pizza",
      "burger",
      "biryani",
      "dominos",
      "kfc",
      "mcd",
      "pancake",
      "pancakes",
      "waffle",
      "dosa",
      "idli",
      "outside home",
      "outside",
      "eat out",
      "eating out",
      "lunch",
      "dinner",
      "breakfast",
      "brunch",
      "meal out",
      "hotel",
      "canteen",
      "food court",
      "takeaway",
      "take away",
    ],
  },
  food_small: {
    id: "food_small",
    label: "Tea, Coffee & Snacks",
    color: "#eab308",
    isInvestment: false,
    keywords: [
      "tea",
      "coffee",
      "chai",
      "snack",
      "cafe",
      "juice",
      "samosa",
      "biscuit",
      "cold drink",
      "lassi",
    ],
  },
  investments: {
    id: "investments",
    label: "Investments",
    color: "#22c55e",
    isInvestment: true,
    keywords: [
      "sip",
      "mutual fund",
      "stock",
      "invest",
      "fd",
      "gold",
      "crypto",
      "nifty",
      "zerodha",
      "groww",
    ],
  },
  entertainment: {
    id: "entertainment",
    label: "Entertainment",
    color: "#a855f7",
    isInvestment: false,
    keywords: [
      "movie",
      "game",
      "concert",
      "netflix",
      "spotify",
      "theatre",
      "bowling",
      "party",
    ],
  },
  fuel_transport: {
    id: "fuel_transport",
    label: "Fuel / Transport",
    color: "#3b82f6",
    isInvestment: false,
    keywords: [
      "fuel",
      "petrol",
      "diesel",
      "uber",
      "ola",
      "metro",
      "bus",
      "cab",
      "auto",
      "parking",
      "rapido",
    ],
  },
  clothing: {
    id: "clothing",
    label: "Clothing & Accessories",
    color: "#ec4899",
    isInvestment: false,
    keywords: [
      "clothes",
      "shirt",
      "shoes",
      "socks",
      "underwear",
      "slippers",
      "accessory",
      "watch",
      "belt",
      "jacket",
      "pants",
      "myntra",
      "ajio",
    ],
  },
  miscellaneous: {
    id: "miscellaneous",
    label: "Miscellaneous",
    color: "#6b7280",
    isInvestment: false,
    keywords: [],
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

export const CATEGORY_LIST = Object.values(CATEGORIES);

export const SPENDING_CATEGORIES = CATEGORY_LIST.filter((c) => !c.isInvestment);

export function getCategoryLabel(id: string): string {
  return CATEGORIES[id as CategoryId]?.label ?? id;
}

export function isValidCategory(id: string): id is CategoryId {
  return id in CATEGORIES;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
