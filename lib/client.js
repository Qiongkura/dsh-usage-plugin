window.__ModuleLoader__.load({
	id: "dsh-usage-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:C:\Users\Administrator\Desktop\dsh-usage-plugin\src\client\UsagePanel.module.css.mjs
		const css$1 = ".aA547q_overlay{z-index:1000;position:fixed;inset:0}.aA547q_mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}.aA547q_panel{background:var(--dsw-alias-bg-overlay);width:min(880px,100vw - 48px);max-height:min(700px,100vh - 48px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:12px;flex-direction:column;gap:10px;padding:16px;display:flex;position:absolute;top:50%;left:50%;overflow:auto;transform:translate(-50%,-50%)}.aA547q_header{justify-content:space-between;align-items:center;gap:8px;display:flex}.aA547q_title{margin:0;font-size:15px;font-weight:600;line-height:22px}.aA547q_close{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;justify-content:center;align-items:center;font-size:12px;display:inline-flex}.aA547q_close:hover,.aA547q_close:focus-visible{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}.aA547q_controls{flex-direction:column;gap:8px;display:flex}.aA547q_chips{flex-wrap:wrap;gap:6px;display:flex}.aA547q_chip{min-height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:1px solid #0000;border-radius:999px;padding:2px 10px;font-size:12px;line-height:18px}.aA547q_chip.aA547q_active{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary);background:0 0}.aA547q_range{align-items:center;gap:8px;display:flex}.aA547q_range input{color-scheme:dark;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);width:132px;min-height:26px;color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-label-tertiary);border-radius:6px;flex:none;padding:2px 8px;font-size:12px}.aA547q_range .aA547q_dash{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px;line-height:20px}.aA547q_note{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px}.aA547q_summary{margin:0;font-size:13px;font-weight:600;line-height:20px}.aA547q_bars{flex-direction:column;gap:2px;display:flex}.aA547q_barRow{grid-template-columns:210px minmax(0,1fr) 72px;align-items:center;gap:8px;display:grid}.aA547q_barLabel{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:16px;overflow:hidden}.aA547q_barTrack{background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;height:4px;overflow:hidden}.aA547q_barFill{background:var(--dsw-alias-state-business-primary);border-radius:999px;height:100%}.aA547q_barValue{color:var(--dsw-alias-label-secondary);text-align:right;font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}.aA547q_table{border-collapse:collapse;font-variant-numeric:tabular-nums;width:100%;font-size:12px;line-height:18px}.aA547q_table th,.aA547q_table td{border-bottom:1px solid var(--dsw-alias-line-strong);text-align:right;white-space:nowrap;padding:4px 8px}.aA547q_table th{color:var(--dsw-alias-label-tertiary);font-weight:500}.aA547q_table td{color:var(--dsw-alias-label-primary)}.aA547q_table th:first-child,.aA547q_table td:first-child{text-align:left}.aA547q_table tfoot th,.aA547q_table tfoot td{border-bottom:0;font-weight:600}.aA547q_quotaSection{flex-wrap:wrap;gap:12px;display:flex}.aA547q_quotaCard{background:var(--dsw-alias-bg-layer-2);border-radius:10px;flex-direction:column;flex:220px;gap:6px;padding:12px;display:flex}.aA547q_quotaHead{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.aA547q_quotaLabel{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:18px}.aA547q_quotaPercent{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:600;line-height:18px}.aA547q_quotaTrack{background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;height:8px;overflow:hidden}.aA547q_quotaFill{background:var(--dsw-alias-state-business-primary);border-radius:999px;height:100%;transition:width .3s}.aA547q_quotaFill.aA547q_warn{background:#e8a33a}.aA547q_quotaFill.aA547q_danger{background:#e0524a}.aA547q_quotaReset{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:16px}";
		const tagId$1 = "dsh-usage-plugin/UsagePanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-usage-plugin";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var UsagePanel_module_css_default = {
			"barValue": "aA547q_barValue",
			"quotaReset": "aA547q_quotaReset",
			"barTrack": "aA547q_barTrack",
			"barLabel": "aA547q_barLabel",
			"active": "aA547q_active",
			"range": "aA547q_range",
			"quotaHead": "aA547q_quotaHead",
			"summary": "aA547q_summary",
			"chips": "aA547q_chips",
			"close": "aA547q_close",
			"title": "aA547q_title",
			"quotaFill": "aA547q_quotaFill",
			"barRow": "aA547q_barRow",
			"mask": "aA547q_mask",
			"quotaPercent": "aA547q_quotaPercent",
			"quotaSection": "aA547q_quotaSection",
			"overlay": "aA547q_overlay",
			"controls": "aA547q_controls",
			"quotaTrack": "aA547q_quotaTrack",
			"panel": "aA547q_panel",
			"header": "aA547q_header",
			"note": "aA547q_note",
			"bars": "aA547q_bars",
			"dash": "aA547q_dash",
			"warn": "aA547q_warn",
			"danger": "aA547q_danger",
			"barFill": "aA547q_barFill",
			"table": "aA547q_table",
			"chip": "aA547q_chip",
			"quotaLabel": "aA547q_quotaLabel",
			"quotaCard": "aA547q_quotaCard"
		};
		//#endregion
		//#region src/client/UsagePanel.tsx
		/**
		* Usage statistics modal: date presets + group-by chips over the
		* `usage.query` remote, rendered as a daily/model/session bar strip plus a
		* grouped totals table. Component-local viewing state only — every datum
		* comes from one unary call, refetched when the range or grouping changes.
		*/
		const DIMENSIONS = [
			"day",
			"model",
			"session",
			"workspace"
		];
		const SORTS = [
			"default",
			"tokens-desc",
			"tokens-asc"
		];
		/** Local calendar day literal (`YYYY-MM-DD`) at `offsetDays` from today. */
		function localDay(offsetDays) {
			const date = /* @__PURE__ */ new Date();
			date.setDate(date.getDate() + offsetDays);
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return `${String(date.getFullYear())}-${month}-${day}`;
		}
		const columnKey = (dimension) => dimension === "day" ? "column.day" : dimension === "model" ? "column.model" : dimension === "workspace" ? "column.workspace" : "column.session";
		/** Short display name for a workspace path: the last path segment only. */
		function workspaceName(path) {
			const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);
			return segments.length > 0 ? segments[segments.length - 1] : path;
		}
		/** Rows with their first grouped dimension as the bar label. */
		function barsOf(data, first) {
			if (data === void 0) return [];
			/* v8 ignore next 2 -- the toggle keeps at least one dimension, so `first` is always defined */
			if (first === void 0) return [];
			const field = first === "day" ? "day" : first === "model" ? "model" : first === "workspace" ? "workspace" : "sessionId";
			/* v8 ignore next -- every row carries the selected dimension field, so the fallback is unreachable */
			return data.rows.map((row) => ({
				label: first === "session" ? row.sessionTitle ?? row.sessionId ?? "" : first === "workspace" && row.workspace !== void 0 ? workspaceName(row.workspace) : row[field] ?? "",
				value: row.totalTokens
			}));
		}
		const QUOTA_PERIODS = [
			{
				key: "rolling",
				labelKey: "quota.rolling",
				limit: 1e5,
				windowMs: 3600 * 1e3
			},
			{
				key: "weekly",
				labelKey: "quota.weekly",
				limit: 1e7,
				windowMs: null
			},
			{
				key: "monthly",
				labelKey: "quota.monthly",
				limit: 5e7,
				windowMs: null
			}
		];
		/** Compute the start/end/resetAt for a quota period relative to `now`. */
		function periodBounds(def, now) {
			if (def.windowMs !== null) return {
				from: new Date(now.getTime() - def.windowMs),
				to: now,
				resetAt: new Date(now.getTime() + (def.windowMs - now.getTime() % def.windowMs))
			};
			if (def.key === "weekly") {
				const day = now.getDay();
				const mondayOffset = day === 0 ? -6 : 1 - day;
				const from = new Date(now);
				from.setDate(from.getDate() + mondayOffset);
				from.setHours(0, 0, 0, 0);
				const resetAt = new Date(from);
				resetAt.setDate(resetAt.getDate() + 7);
				return {
					from,
					to: now,
					resetAt
				};
			}
			return {
				from: new Date(now.getFullYear(), now.getMonth(), 1),
				to: now,
				resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
			};
		}
		/** Format a countdown from now to `resetAt`. */
		function formatCountdown(resetAt, now) {
			const diff = Math.max(0, resetAt.getTime() - now.getTime());
			const days = Math.floor(diff / 864e5);
			const hours = Math.floor(diff % 864e5 / 36e5);
			if (days > 0) return `${days} 天 ${hours} 小时`;
			if (hours > 0) return `${hours} 小时 ${Math.floor(diff % 36e5 / 6e4)} 分钟`;
			return `${Math.floor(diff / 6e4)} 分钟`;
		}
		function quotaFillClass(pct) {
			if (pct >= 80) return `${UsagePanel_module_css_default.quotaFill} ${UsagePanel_module_css_default.danger}`;
			if (pct >= 50) return `${UsagePanel_module_css_default.quotaFill} ${UsagePanel_module_css_default.warn}`;
			return UsagePanel_module_css_default.quotaFill;
		}
		/** Cell text for one dimension field: unknown models translate, absent fields dash. */
		function cellOf(row, dimension, t) {
			const value = dimension === "day" ? row.day : dimension === "model" ? row.model : dimension === "workspace" ? row.workspace === void 0 ? void 0 : workspaceName(row.workspace) : row.sessionTitle ?? row.sessionId;
			/* v8 ignore next -- cellOf runs only for grouped dimensions, whose rows always carry the field */
			if (value === void 0 || value === "") return "—";
			if (dimension === "model" && value === "unknown") return t("model.unknown");
			return value;
		}
		/**
		* The usage modal.
		* @param props - injected API face, copy, and close path.
		*/
		function UsagePanel({ api, t, onClose }) {
			const [preset, setPreset] = (0, react.useState)("days7");
			const [from, setFrom] = (0, react.useState)(() => localDay(-6));
			const [to, setTo] = (0, react.useState)(() => localDay(0));
			const [asOf] = (0, react.useState)(() => Date.now());
			const [groupBy, setGroupBy] = (0, react.useState)(["day", "model"]);
			const [sortBy, setSortBy] = (0, react.useState)("default");
			const [data, setData] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const [loading, setLoading] = (0, react.useState)(true);
			const titleId = (0, react.useRef)(`usage-title-${Math.random().toString(36).slice(2)}`).current;
			const groupKey = groupBy.join(",");
			const applyPreset = (next) => {
				setPreset(next);
				if (next === "today") {
					setFrom(localDay(0));
					setTo(localDay(0));
				} else if (next === "days7") {
					setFrom(localDay(-6));
					setTo(localDay(0));
				} else if (next === "days30") {
					setFrom(localDay(-29));
					setTo(localDay(0));
				} else {
					setFrom("");
					setTo("");
				}
			};
			const toggleDimension = (dimension) => {
				setGroupBy((current) => {
					if (current.includes(dimension)) return current.length > 1 ? current.filter((d) => d !== dimension) : current;
					return [...current, dimension];
				});
			};
			(0, react.useEffect)(() => {
				let cancelled = false;
				setLoading(true);
				api.usage.query({
					...from === "" ? {} : { from },
					...to === "" ? {} : { to },
					asOf,
					groupBy: [...groupBy],
					...sortBy === "default" ? {} : { sortBy }
				}).then((response) => {
					if (cancelled) return;
					setLoading(false);
					if (response.result.ok) {
						setData(response.result.value);
						setError(void 0);
					} else setError(response.result.error.message);
				}, (reason) => {
					if (cancelled) return;
					setLoading(false);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					cancelled = true;
				};
			}, [
				api,
				from,
				to,
				groupKey,
				sortBy
			]);
			(0, react.useEffect)(() => {
				const onKeyDown = (e) => {
					if (e.key === "Escape") onClose();
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [onClose]);
			const [quotaData, setQuotaData] = (0, react.useState)([]);
			const [tick, setTick] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				let cancelled = false;
				const now = Date.now();
				const rlPromise = api.usage.rateLimits().then((resp) => cancelled ? null : resp.result.ok ? resp.result.value : null, () => null);
				const usagePromise = Promise.all(QUOTA_PERIODS.map(async (def) => {
					const { from, to, resetAt } = periodBounds(def, now);
					const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
					const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;
					try {
						const resp = await api.usage.query({
							from: fromStr,
							to: toStr,
							asOf: now,
							groupBy: []
						});
						if (cancelled || !resp.result.ok) return {
							period: def,
							used: 0,
							limit: def.limit,
							resetAt
						};
						return {
							period: def,
							used: resp.result.value.total.totalTokens,
							limit: def.limit,
							resetAt
						};
					} catch {
						return {
							period: def,
							used: 0,
							limit: def.limit,
							resetAt
						};
					}
				}));
				Promise.all([rlPromise, usagePromise]).then(([rl, usages]) => {
					if (cancelled) return;
					setQuotaData(usages.map((u) => {
						let limit = u.limit;
						let resetAt = u.resetAt;
						if (u.period.key === "rolling" && rl !== null) {
							if (rl.limitTokens !== void 0 && rl.limitTokens > 0) limit = rl.limitTokens;
							if (rl.resetTokens !== void 0) {
								const parsed = Date.parse(rl.resetTokens);
								if (!isNaN(parsed) && parsed > now) resetAt = new Date(parsed);
							}
						}
						const pct = limit > 0 ? Math.min(100, Math.round(u.used / limit * 100)) : 0;
						return {
							period: u.period,
							used: u.used,
							limit,
							pct,
							resetAt
						};
					}));
				});
				return () => {
					cancelled = true;
				};
			}, [api]);
			(0, react.useEffect)(() => {
				const id = setInterval(() => setTick((n) => n + 1), 6e4);
				return () => clearInterval(id);
			}, []);
			const bars = (0, react.useMemo)(() => barsOf(data, groupBy[0]), [data, groupBy]);
			const max = Math.max(1, ...bars.map((bar) => bar.value));
			const totalRequests = data === void 0 ? 0 : data.rows.reduce((sum, row) => sum + row.requests, 0);
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: UsagePanel_module_css_default.overlay,
				role: "presentation",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: UsagePanel_module_css_default.mask,
					"aria-hidden": "true",
					onClick: onClose
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UsagePanel_module_css_default.panel,
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": titleId,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: UsagePanel_module_css_default.header,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: UsagePanel_module_css_default.title,
								id: titleId,
								children: t("panel.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: UsagePanel_module_css_default.close,
								"aria-label": t("panel.close"),
								onClick: onClose,
								children: "✕"
							})]
						}),
						quotaData.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: UsagePanel_module_css_default.quotaSection,
							children: quotaData.map((q) => {
								const now = Date.now();
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsagePanel_module_css_default.quotaCard,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: UsagePanel_module_css_default.quotaHead,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: UsagePanel_module_css_default.quotaLabel,
												children: t(q.period.labelKey)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: UsagePanel_module_css_default.quotaPercent,
												children: [q.pct, "%"]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: UsagePanel_module_css_default.quotaTrack,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: quotaFillClass(q.pct),
												style: { width: `${q.pct}%` }
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsagePanel_module_css_default.quotaReset,
											children: q.pct > 0 ? t("quota.resetIn", { time: formatCountdown(q.resetAt, new Date(now)) }) : t("quota.noData")
										})
									]
								}, q.period.key);
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: UsagePanel_module_css_default.controls,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsagePanel_module_css_default.chips,
									role: "group",
									"aria-label": t("panel.title"),
									children: [
										"today",
										"days7",
										"days30",
										"all"
									].map((presetId) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: preset === presetId ? `${UsagePanel_module_css_default.chip} ${UsagePanel_module_css_default.active}` : UsagePanel_module_css_default.chip,
										"aria-pressed": preset === presetId,
										onClick: () => {
											applyPreset(presetId);
										},
										children: t(`preset.${presetId}`)
									}, presetId))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsagePanel_module_css_default.range,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "date",
											"aria-label": t("preset.custom"),
											value: from,
											onChange: (e) => {
												setFrom(e.target.value);
												setPreset("custom");
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsagePanel_module_css_default.dash,
											"aria-hidden": "true",
											children: "–"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "date",
											"aria-label": t("preset.custom"),
											value: to,
											onChange: (e) => {
												setTo(e.target.value);
												setPreset("custom");
											}
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsagePanel_module_css_default.chips,
									role: "group",
									"aria-label": t("panel.title"),
									children: DIMENSIONS.map((dimension) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: groupBy.includes(dimension) ? `${UsagePanel_module_css_default.chip} ${UsagePanel_module_css_default.active}` : UsagePanel_module_css_default.chip,
										"aria-pressed": groupBy.includes(dimension),
										onClick: () => {
											toggleDimension(dimension);
										},
										children: t(columnKey(dimension))
									}, dimension))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: UsagePanel_module_css_default.chips,
									role: "group",
									"aria-label": t("sort.label"),
									children: SORTS.map((sort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: sortBy === sort ? `${UsagePanel_module_css_default.chip} ${UsagePanel_module_css_default.active}` : UsagePanel_module_css_default.chip,
										"aria-pressed": sortBy === sort,
										onClick: () => {
											setSortBy(sort);
										},
										children: t(`sort.${sort}`)
									}, sort))
								})
							]
						}),
						loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsagePanel_module_css_default.note,
							children: t("panel.loading")
						}),
						!loading && error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsagePanel_module_css_default.note,
							children: t("panel.error", { message: error })
						}),
						!loading && error === void 0 && data !== void 0 && data.rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: UsagePanel_module_css_default.note,
							children: t("panel.empty")
						}),
						!loading && error === void 0 && data !== void 0 && data.rows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: UsagePanel_module_css_default.summary,
								children: [t("summary.total", {
									tokens: data.total.totalTokens.toLocaleString(),
									requests: totalRequests.toLocaleString()
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: UsagePanel_module_css_default.asOf,
									children: [" ", t("panel.asOf", { time: new Date(asOf).toLocaleString() })]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: UsagePanel_module_css_default.bars,
								role: "img",
								"aria-label": t("panel.title"),
								children: bars.map((bar) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: UsagePanel_module_css_default.barRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsagePanel_module_css_default.barLabel,
											children: bar.label
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: UsagePanel_module_css_default.barTrack,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: UsagePanel_module_css_default.barFill,
												style: { width: `${bar.value / max * 100}%` }
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: UsagePanel_module_css_default.barValue,
											children: bar.value.toLocaleString()
										})
									]
								}, bar.label))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
								className: UsagePanel_module_css_default.table,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										groupBy.map((dimension) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "col",
											children: t(columnKey(dimension))
										}, dimension)),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "col",
											children: t("column.input")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "col",
											children: t("column.output")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "col",
											children: t("column.cacheRead")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "col",
											children: t("column.cacheWrite")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "col",
											children: t("column.total")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "col",
											children: t("column.requests")
										})
									] }) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: data.rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										groupBy.map((dimension) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: cellOf(row, dimension, t) }, dimension)),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.inputTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.outputTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cacheReadTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cacheWriteTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.totalTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.requests.toLocaleString() })
									] }, `${row.day ?? ""}-${row.model ?? ""}-${row.sessionId ?? ""}-${index}`)) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tfoot", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											scope: "row",
											colSpan: groupBy.length,
											children: t("column.total")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: data.total.inputTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: data.total.outputTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: data.total.cacheReadTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: data.total.cacheWriteTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: data.total.totalTokens.toLocaleString() }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: totalRequests.toLocaleString() })
									] }) })
								]
							})
						] })
					]
				})]
			}), document.body);
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Administrator\Desktop\dsh-usage-plugin\src\client\UsageTrigger.module.css.mjs
		const css = ".VD8YSq_trigger{min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:6px;padding:3px 6px;font-size:12px;line-height:18px;display:inline-flex}.VD8YSq_trigger:hover,.VD8YSq_trigger:focus-visible{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}.VD8YSq_icon{flex:none}.VD8YSq_label{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}";
		const tagId = "dsh-usage-plugin/UsageTrigger.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-usage-plugin";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var UsageTrigger_module_css_default = {
			"icon": "VD8YSq_icon",
			"trigger": "VD8YSq_trigger",
			"label": "VD8YSq_label"
		};
		//#endregion
		//#region src/client/UsageTrigger.tsx
		/**
		* Sidebar-foot trigger for the usage modal: an icon row that expands to an
		* icon + label when the sidebar is wide. Component-local open state only.
		*/
		/**
		* The sidebar-foot trigger row and its modal.
		* @param props - owner share plus injected API face and copy.
		*/
		function UsageTrigger({ wide, api, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: UsageTrigger_module_css_default.trigger,
				"aria-label": t("trigger.aria"),
				title: t("trigger.label"),
				onClick: () => {
					setOpen(true);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, {
					size: 16,
					className: UsageTrigger_module_css_default.icon
				}), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: UsageTrigger_module_css_default.label,
					children: t("trigger.label")
				})]
			}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsagePanel, {
				api,
				t,
				onClose: () => {
					setOpen(false);
				}
			})] });
		}
		//#endregion
		//#region src/client/locales.ts
		/** `usage` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "usage";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"trigger.label": "用量统计",
			"trigger.aria": "打开 Token 用量统计",
			"panel.title": "Token 用量统计",
			"panel.close": "关闭",
			"panel.loading": "加载中…",
			"panel.empty": "该范围内暂无用量记录",
			"panel.error": "查询失败：{message}",
			"preset.today": "今天",
			"preset.days7": "近 7 天",
			"preset.days30": "近 30 天",
			"preset.all": "全部",
			"preset.custom": "自定义",
			"group.day": "按天",
			"group.model": "按模型",
			"group.session": "按会话",
			"group.workspace": "按工作区",
			"column.day": "日期",
			"column.model": "模型",
			"column.session": "会话",
			"column.workspace": "工作区",
			"sort.label": "排序",
			"sort.default": "默认排序",
			"sort.tokens-desc": "用量从多到少",
			"sort.tokens-asc": "用量从少到多",
			"column.input": "输入",
			"column.output": "输出",
			"column.cacheRead": "缓存读",
			"column.cacheWrite": "缓存写",
			"column.total": "合计",
			"column.requests": "请求数",
			"summary.total": "共 {tokens} tokens，{requests} 次请求",
			"panel.asOf": "（统计截止 {time}）",
			"model.unknown": "未知模型",
			"quota.rolling": "滚动用量",
			"quota.weekly": "每周用量",
			"quota.monthly": "每月用量",
			"quota.resetIn": "重置于 {time}",
			"quota.noData": "暂无数据"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"trigger.label": "Usage stats",
			"trigger.aria": "Open token usage statistics",
			"panel.title": "Token usage",
			"panel.close": "Close",
			"panel.loading": "Loading…",
			"panel.empty": "No usage records in this range",
			"panel.error": "Query failed: {message}",
			"preset.today": "Today",
			"preset.days7": "Last 7 days",
			"preset.days30": "Last 30 days",
			"preset.all": "All time",
			"preset.custom": "Custom",
			"group.day": "By day",
			"group.model": "By model",
			"group.session": "By session",
			"group.workspace": "By workspace",
			"column.day": "Date",
			"column.model": "Model",
			"column.session": "Session",
			"column.workspace": "Workspace",
			"sort.label": "Sort",
			"sort.default": "Default order",
			"sort.tokens-desc": "Most tokens first",
			"sort.tokens-asc": "Fewest tokens first",
			"column.input": "Input",
			"column.output": "Output",
			"column.cacheRead": "Cache read",
			"column.cacheWrite": "Cache write",
			"column.total": "Total",
			"column.requests": "Requests",
			"summary.total": "{tokens} tokens across {requests} requests",
			"panel.asOf": "(as of {time})",
			"model.unknown": "Unknown model",
			"quota.rolling": "Rolling usage",
			"quota.weekly": "Weekly usage",
			"quota.monthly": "Monthly usage",
			"quota.resetIn": "Resets in {time}",
			"quota.noData": "No data yet"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services for locale registration and the footer-action contribution. */
		const inject = [
			"slots",
			"locale",
			"connection"
		];
		/**
		* Client plugin body: register the dictionaries and the footer action.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-usage: dictionaries");
			const connection = ctx.get("connection");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "usage",
				order: 30,
				locale: NS,
				/* v8 ignore next -- the inject face runs only at render time, outside the plugin test bench */
				inject: () => ({
					api: connection.api,
					t
				})
			}, UsageTrigger));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
