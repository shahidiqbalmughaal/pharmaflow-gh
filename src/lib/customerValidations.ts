import { z } from "zod";

export const customerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Customer name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .trim()
    .min(1, "Phone number is required")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format"),
  whatsapp: z.string()
    .trim()
    .max(20, "WhatsApp number must be less than 20 characters")
    .regex(/^[\d\s\-\+\(\)]*$/, "Invalid WhatsApp number format")
    .optional()
    .or(z.literal("")),
  address: z.string()
    .trim()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .trim()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
});

export const customerDiscountSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  discountPercentage: z.number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  reason: z.string()
    .trim()
    .max(200, "Reason must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});
