/** Groups match by display name; attribute ids differ between catalog sources and categories. */
export const groupKey = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");
