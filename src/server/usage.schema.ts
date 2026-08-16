/**
 * usage domain zod schemas. Read-only shapes: the request carries the day
 * window, grouping, and optional token ordering; the value is the aggregated
 * rows plus grand total. Self-contained — no host-apiproxy internals.
 */

import { z } from 'zod'

/** usage.query groupBy dimension. */
export const usageDimensionSchema = z.enum(['day', 'model', 'session', 'workspace'])

/** usage.query day-bound literal. */
export const usageDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

/** usage.query row ordering. */
export const usageSortSchema = z.enum(['tokens-desc', 'tokens-asc'])

/** usage.query request payload. */
export const usageQueryRequestSchema = z.object({
  from: usageDateSchema.optional(),
  to: usageDateSchema.optional(),
  asOf: z.number().int().positive().optional(),
  groupBy: z.array(usageDimensionSchema).min(1),
  sortBy: usageSortSchema.optional(),
})

/** usage.query token-bucket totals. */
export const usageTokenTotalsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
})

/** usage.query result row (dimension fields present only when grouped). */
export const usageRowSchema = usageTokenTotalsSchema.extend({
  day: z.string().optional(),
  model: z.string().optional(),
  sessionId: z.string().optional(),
  sessionTitle: z.string().optional(),
  workspace: z.string().optional(),
  requests: z.number().int().nonnegative(),
})

/** usage.query response value. */
export const usageQueryValueSchema = z.object({
  rows: z.array(usageRowSchema),
  total: usageTokenTotalsSchema,
})
