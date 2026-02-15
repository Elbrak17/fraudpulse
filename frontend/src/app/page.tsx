"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import StatsCards from "@/components/StatsCards";
import TransactionFeed from "@/components/TransactionFeed";
import ShapWaterfall from "@/components/ShapWaterfall";
import AlertPanel from "@/components/AlertPanel";
import TimelineChart from "@/components/TimelineChart";
import RiskDistribution from "@/components/RiskDistribution";
import { useTransactionStream } from "@/hooks/useTransactionStream";
import {
  fetchPrediction,
  fetchShap,
  Stats,
  StreamTransaction,
  ShapValue,
} from "@/lib/api";

export default function DashboardPage() {
  const { transactions, recentTransactions, connectionMode } = useTransactionStream(50);

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
    // Accuracy: compare model flag vs actual is_fraud
    const correct = transactions.filter((t) => {
      const modelSaysFraud = t.risk_level === "CRITICAL" || t.risk_level === "HIGH";
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
    <div className="min-h-screen p-4 lg:p-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-danger flex items-center justify-center text-xl font-bold">
            🛡️
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              FraudPulse
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              AI-Powered Fraud Detection Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 glass-card px-3 py-1.5 rounded-full">
            <span className="text-xs text-[var(--color-text-muted)]">Models:</span>
            <span className="text-xs font-medium text-emerald-400">IF + AE</span>
            <span className="text-[var(--color-text-muted)]">|</span>
            <span className="text-xs font-medium text-blue-400">Gemini 3</span>
          </div>
          <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-full">
            <span
              className={`w-2 h-2 rounded-full pulse-dot ${connectionMode === "ws"
                ? "bg-emerald-400"
                : connectionMode === "poll"
                  ? "bg-amber-400"
                  : "bg-gray-400"
                }`}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">
              {connectionMode === "ws"
                ? "Live"
                : connectionMode === "poll"
                  ? "Polling"
                  : "..."}
            </span>
          </div>
        </div>
      </motion.header>

      {/* ── Stats Row (live-updating) ──────────────────────── */}
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
      <footer className="mt-6 text-center text-xs text-[var(--color-text-muted)] py-4 border-t border-white/5">
        FraudPulse — Built for DevDash 2026 • Powered by Isolation Forest +
        Autoencoder + SHAP + Gemini 3 Flash Preview
      </footer>
    </div>
  );
}
