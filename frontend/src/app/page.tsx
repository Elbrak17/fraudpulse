"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import StatsCards from "@/components/StatsCards";
import TransactionFeed from "@/components/TransactionFeed";
import ShapWaterfall from "@/components/ShapWaterfall";
import AlertPanel from "@/components/AlertPanel";
import TimelineChart from "@/components/TimelineChart";
import RiskDistribution from "@/components/RiskDistribution";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useTransactionStream } from "@/hooks/useTransactionStream";
import {
  fetchPrediction,
  fetchShap,
  fetchStats,
  Stats,
  StreamTransaction,
  ShapValue,
} from "@/lib/api";

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="stat-number text-sm text-[var(--color-text-secondary)]">
      {time}
    </span>
  );
}

/* ── SVG Logo Icon ──────────────────────────────────── */
function ShieldPulseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="drop-shadow-lg"
    >
      <path
        d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
        fill="url(#shield-gradient)"
        fillOpacity="0.15"
        stroke="url(#shield-gradient)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Pulse line inside shield */}
      <path
        d="M7 12h2l1.5-3 2 6 1.5-3H17"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="shield-gradient" x1="4" y1="2" x2="20" y2="20">
          <stop stopColor="#3b82f6" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function DashboardPage() {
  const { transactions, recentTransactions, connectionMode } =
    useTransactionStream(50);

  // Selected transaction state
  const [selectedTx, setSelectedTx] = useState<StreamTransaction | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<{
    if_score: number;
    ae_reconstruction_error: number;
    combined_confidence: number;
    risk_level: string;
    recommendation: string;
  } | null>(null);
  const [shapValues, setShapValues] = useState<ShapValue[] | null>(null);
  const [shapBase, setShapBase] = useState(0);
  const [shapLoading, setShapLoading] = useState(false);

  // ── Stats from server (single source of truth, polled periodically) ──
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await fetchStats();
        setStats(s);
      } catch {
        // Server not ready yet
      }
    };
    loadStats();

    // Poll stats every 3 seconds for live updates
    const interval = setInterval(loadStats, 3000);

    // Also refresh when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadStats();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Handle transaction selection
  const handleSelectTransaction = useCallback(
    async (tx: StreamTransaction) => {
      setSelectedTx(tx);
      setShapLoading(true);
      setShapValues(null);
      setSelectedPrediction(null);

      try {
        const [pred, shap] = await Promise.all([
          fetchPrediction(tx.df_idx),
          fetchShap(tx.df_idx),
        ]);
        setSelectedPrediction({
          if_score: pred.if_score,
          ae_reconstruction_error: pred.ae_reconstruction_error,
          combined_confidence: pred.combined_confidence,
          risk_level: pred.risk_level,
          recommendation: pred.recommendation,
        });
        setShapValues(shap.shap_values);
        setShapBase(shap.base_value);
      } catch (e) {
        console.error("Prediction/SHAP error:", e);
      } finally {
        setShapLoading(false);
      }
    },
    []
  );

  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-[1600px] mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-4">
          {/* SVG Shield-Pulse Logo */}
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <ShieldPulseIcon />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold gradient-text tracking-tight">
              FraudPulse
            </h1>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em] font-medium">
              AI-Powered Fraud Detection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live clock */}
          <div className="hidden md:flex items-center gap-2 glass-card px-3 py-1.5 rounded-full">
            <LiveClock />
          </div>

          {/* Model stack badge */}
          <div className="hidden lg:flex items-center gap-2 glass-card px-3 py-1.5 rounded-full">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase">
              Models
            </span>
            <span className="text-[10px] font-bold text-emerald-400">
              IF + AE
            </span>
            <span className="text-[var(--color-text-muted)] text-xs opacity-30">|</span>
            <span className="text-[10px] font-bold text-blue-400">
              Gemini 3
            </span>
          </div>

          {/* Connection indicator */}
          <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionMode === "ws"
                  ? "bg-emerald-400 animate-ping"
                  : connectionMode === "poll"
                    ? "bg-amber-400"
                    : "bg-gray-400"
                  }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connectionMode === "ws"
                  ? "bg-emerald-400"
                  : connectionMode === "poll"
                    ? "bg-amber-400"
                    : "bg-gray-400"
                  }`}
              />
            </span>
            <span className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              {connectionMode === "ws"
                ? "Live"
                : connectionMode === "poll"
                  ? "Polling"
                  : "..."}
            </span>
          </div>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </motion.header>

      {/* ── Header Separator ────────────────────────────────── */}
      <div className="header-separator mb-5" />

      {/* ── Stats Row ──────────────────────────────────────── */}
      <StatsCards stats={stats} />

      {/* ── Main Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column — Transaction Feed */}
        <div className="lg:col-span-3 h-[600px]">
          <TransactionFeed
            transactions={recentTransactions}
            connectionMode={connectionMode}
            onSelect={handleSelectTransaction}
            selectedId={selectedTx?.id ?? null}
          />
        </div>

        {/* Center Column — SHAP + Risk Distribution */}
        <div className="lg:col-span-5 h-[600px] flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <ShapWaterfall
              shapValues={shapValues}
              baseValue={shapBase}
              loading={shapLoading}
            />
          </div>
          <div className="flex-shrink-0">
            <RiskDistribution stats={stats} />
          </div>
        </div>

        {/* Right Column — Alert Panel (full height) */}
        <div className="lg:col-span-4 h-[600px]">
          <AlertPanel
            transactionId={selectedTx?.id ?? null}
            dfIdx={selectedTx?.df_idx ?? null}
            riskLevel={
              selectedPrediction?.risk_level ?? selectedTx?.risk_level ?? null
            }
            ifScore={selectedPrediction?.if_score ?? null}
            aeScore={
              selectedPrediction?.ae_reconstruction_error ?? null
            }
            recommendation={
              selectedPrediction?.recommendation ??
              selectedTx?.recommendation ??
              null
            }
            confidence={
              selectedPrediction?.combined_confidence ??
              selectedTx?.combined_confidence ??
              null
            }
            amount={selectedTx?.amount ?? null}
            isFraud={selectedTx?.is_fraud ?? null}
            ifLabel={selectedTx?.if_label ?? null}
            aeLabel={selectedTx?.ae_label ?? null}
          />
        </div>
      </div>

      {/* ── Risk Trend — Full Width ────────────────────────── */}
      <div className="mt-4">
        <TimelineChart transactions={recentTransactions} />
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="mt-8 py-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em]">
            FraudPulse — DevDash 2026
          </span>
          <span className="text-[var(--color-text-muted)] opacity-30">|</span>
          <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">
            IF + AE + SHAP + Gemini 3 Flash
          </span>
        </div>
      </footer>
    </div>
  );
}
