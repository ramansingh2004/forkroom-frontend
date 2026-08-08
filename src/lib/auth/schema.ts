import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.').max(128),
});

export const registerSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(100, 'Name must be 100 characters or fewer.'),

  email: z.string().trim().email('Enter a valid email address.'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be 128 characters or fewer.'),

  terms: z
    .boolean()
    .refine(
      (value) => value,
      'Please accept the Terms and Privacy Policy.',
    ),
});

export const emailSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password must be 128 characters or fewer.'),

    confirmPassword: z.string(),
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    },
  );

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type EmailValues = z.infer<typeof emailSchema>;
export type ResetPasswordValues =
  z.infer<typeof resetPasswordSchema>;