export const CATEGORIES = {
  food_dining_out: {
    id: "food_dining_out",
    label: "Dining Out",
    shortLabel: "Dining",
    color: "#e85d4c",
    isInvestment: false,
    keywords: [
      "restaurant",
      "dining",
      "dining out",
      "pancake",
      "pancakes",
      "waffle",
      "dosa",
      "idli",
      "outside home",
      "outside",
      "eat out",
      "eating out",
      "lunch out",
      "dinner out",
      "breakfast out",
      "brunch",
      "meal out",
      "lunch",
      "dinner",
      "breakfast",
      "hotel",
      "canteen",
      "food court",
      "takeaway",
      "take away",
    ],
  },
  food_ordering_in: {
    id: "food_ordering_in",
    label: "Ordering In",
    shortLabel: "Delivery",
    color: "#f59e0b",
    isInvestment: false,
    keywords: [
      "zomato",
      "swiggy",
      "order",
      "ordering",
      "delivery",
      "deliver",
      "pizza",
      "burger",
      "biryani",
      "dominos",
      "kfc",
      "mcd",
      "zepto",
      "blinkit",
      "instamart",
    ],
  },
  food_small: {
    id: "food_small",
    label: "Tea, Coffee & Snacks",
    shortLabel: "Snacks",
    color: "#d4a853",
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
    shortLabel: "Invest",
    color: "#34d399",
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
    shortLabel: "Fun",
    color: "#a78bfa",
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
      "mobile recharge",
      "recharge",
      "prepaid",
      "postpaid",
      "jio",
      "airtel",
      "vi recharge",
      "bsnl",
    ],
  },
  fuel_transport: {
    id: "fuel_transport",
    label: "Fuel / Transport",
    shortLabel: "Transport",
    color: "#60a5fa",
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
    shortLabel: "Clothing",
    color: "#f472b6",
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
    shortLabel: "Other",
    color: "#71717a",
    isInvestment: false,
    keywords: [
      "hackathon",
      "registration",
      "workshop",
      "seminar",
      "conference",
      "webinar",
      "course",
      "exam",
      "fee",
      "donation",
      "gift",
      "repair",
      "maintenance",
      "subscription",
      "membership",
    ],
  },
} as const;

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  food_ordering: "Dining Out",
};

const LEGACY_CATEGORY_COLORS: Record<string, string> = {
  food_ordering: "#e85d4c",
};

export type CategoryId = keyof typeof CATEGORIES;

export const CATEGORY_LIST = Object.values(CATEGORIES);

export const SPENDING_CATEGORIES = CATEGORY_LIST.filter((c) => !c.isInvestment);

export function getCategoryLabel(id: string): string {
  if (id in CATEGORIES) return CATEGORIES[id as CategoryId].label;
  return LEGACY_CATEGORY_LABELS[id] ?? id;
}

export function getCategoryColor(id: string): string {
  if (id in CATEGORIES) return CATEGORIES[id as CategoryId].color;
  return LEGACY_CATEGORY_COLORS[id] ?? "#71717a";
}

export function normalizeCategory(id: string): CategoryId {
  if (id === "food_ordering") return "food_dining_out";
  if (id in CATEGORIES) return id as CategoryId;
  return "miscellaneous";
}

export function isInvestmentCategory(id: string): boolean {
  return CATEGORIES[normalizeCategory(id)].isInvestment;
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

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return formatCurrency(amount);
}
