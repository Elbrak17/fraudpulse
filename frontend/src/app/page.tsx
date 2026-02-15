"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
          hour12: false,
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

  // Compute stats instantly from the transactions array (~0ms delay)
  const stats = useMemo<Stats | null>(() => {
    const total = transactions.length;
    if (total === 0) return null;

    const flagged = transactions.filter(
      (t) => t.risk_level === "CRITICAL" || t.risk_level === "HIGH"
    ).length;
    const blockedAmount = transactions
      .filter((t) => t.recommendation === "BLOCK")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgRisk =
      transactions.reduce((sum, t) => sum + t.combined_confidence, 0) / total;
    const correct = transactions.filter((t) => {
      const modelSaysFraud =
        t.risk_level === "CRITICAL" || t.risk_level === "HIGH";
      return modelSaysFraud === (t.is_fraud === 1);
    }).length;

    return {
      total_transactions: total,
      flagged_transactions: flagged,
      fraud_rate: flagged / total,
      model_accuracy: correct / total,
      blocked_amount: blockedAmount,
      avg_risk_score: avgRisk,
    };
  }, [transactions]);

  // Handle transaction selection
  const handleSelectTransaction = useCallback(
    async (tx: StreamTransaction) => {
      setSelectedTx(tx);
      setShapLoading(true);
      setShapValues(null);
      setSelectedPrediction(null);

      try {
        const [pred, shap] = await Promise.all([
          fetchPrediction(tx.id),
          fetchShap(tx.id),
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
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-4">
          {/* Animated Logo */}
          <div className="relative">
            <div className="w-11 h-11 rounded-xl gradient-danger flex items-center justify-center text-xl shadow-lg shadow-red-500/20">
              🛡️
            </div>
            <div className="pulse-ring text-red-500/40 rounded-xl" />
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
            <span className="text-[var(--color-text-muted)] text-xs">•</span>
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

        {/* Center Column — Charts */}
        <div className="lg:col-span-5 space-y-4">
          <ShapWaterfall
            shapValues={shapValues}
            baseValue={shapBase}
            loading={shapLoading}
          />
          <TimelineChart transactions={recentTransactions} />
        </div>

        {/* Right Column — Alert Panel + Risk Distribution */}
        <div className="lg:col-span-4 space-y-4">
          <div className="h-[400px]">
            <AlertPanel
              transactionId={selectedTx?.id ?? null}
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
            />
          </div>
          <RiskDistribution transactions={recentTransactions} />
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="mt-8 text-center text-[10px] text-[var(--color-text-muted)] py-4 border-t border-white/5 uppercase tracking-[0.15em]">
        FraudPulse — DevDash 2026 • Isolation Forest + Autoencoder + SHAP +
        Gemini 3 Flash
      </footer>
    </div>
  );
}
