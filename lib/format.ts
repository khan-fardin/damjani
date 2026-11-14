export const formatPrice = (price: number) => `৳ ${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(price)}`;

export const formatRelative = (label: string) => label;
