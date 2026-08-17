//#region src/server/usage.schema.d.ts
/**
 * usage domain zod schemas. Read-only shapes: the request carries the day
 * window, grouping, and optional token ordering; the value is the aggregated
 * rows plus grand total. Self-contained — no host-apiproxy internals.
 */
/** usage.query groupBy dimension. */
declare const usageDimensionSchema: any;
/** usage.query day-bound literal. */
declare const usageDateSchema: any;
/** usage.query row ordering. */
declare const usageSortSchema: any;
/** usage.query request payload. */
declare const usageQueryRequestSchema: any;
/** usage.query token-bucket totals. */
declare const usageTokenTotalsSchema: any;
/** usage.query result row (dimension fields present only when grouped). */
declare const usageRowSchema: any;
/** usage.query response value. */
declare const usageQueryValueSchema: any;
//#endregion
export { usageDateSchema, usageDimensionSchema, usageQueryRequestSchema, usageQueryValueSchema, usageRowSchema, usageSortSchema, usageTokenTotalsSchema };