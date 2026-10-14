import { z } from "zod";

const digits = /^\d+$/;

export const CategoryIdSchema = z.string().regex(digits).brand<"CategoryId">();
export const FilterIdSchema = z.string().regex(digits).brand<"FilterId">();
export const ManufacturerIdSchema = z.string().regex(digits).brand<"ManufacturerId">();

export type CategoryId = z.infer<typeof CategoryIdSchema>;
export type FilterId = z.infer<typeof FilterIdSchema>;
export type ManufacturerId = z.infer<typeof ManufacturerIdSchema>;

export const categoryId = (value: string): CategoryId => CategoryIdSchema.parse(value);
export const filterId = (value: string): FilterId => FilterIdSchema.parse(value);
export const manufacturerId = (value: string): ManufacturerId => ManufacturerIdSchema.parse(value);

export const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
