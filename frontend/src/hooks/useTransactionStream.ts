"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WS_URL } from "@/lib/constants";
import { pollTransactions, StreamTransaction } from "@/lib/api";

type ConnectionMode = "ws" | "poll" | "connecting";

/**
 * Custom hook for real-time transaction streaming.
 * Tries WebSocket first, auto-falls back to HTTP polling after 3 failures.
 * Keeps ALL transactions for stats, returns recent ones for display.
 */
export function useTransactionStream(displayLimit: number = 50) {
    const [allTransactions, setAllTransactions] = useState<StreamTransaction[]>([]);
    const [connectionMode, setConnectionMode] = useState<ConnectionMode>("connecting");
    const wsRef = useRef<WebSocket | null>(null);
    const failCountRef = useRef(0);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const latestIdRef = useRef(0);

    const addTransaction = useCallback((tx: StreamTransaction) => {
        setAllTransactions((prev) => [tx, ...prev]);
        latestIdRef.current = Math.max(latestIdRef.current, tx.id);
    }, []);

    // ── WebSocket Connection ──
    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[WS] Connected");
            setConnectionMode("ws");
            failCountRef.current = 0;
        };

        ws.onmessage = (event) => {
            try {
                const tx = JSON.parse(event.data) as StreamTransaction;
                addTransaction(tx);
            } catch (e) {
                console.error("[WS] Parse error:", e);
            }
        };

        ws.onerror = () => {
            failCountRef.current += 1;
            console.warn(`[WS] Error (fail count: ${failCountRef.current})`);
        };

        ws.onclose = () => {
            console.log("[WS] Disconnected");
            if (failCountRef.current >= 3) {
                // Switch to polling fallback
                console.log("[WS] 3 failures — switching to HTTP polling");
                setConnectionMode("poll");
                startPolling();
            } else {
                // Retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, failCountRef.current), 10000);
                setTimeout(connectWebSocket, delay);
            }
        };
    }, [addTransaction]);

    // ── HTTP Polling Fallback ──
    const startPolling = useCallback(() => {
        if (pollingRef.current) return;

        pollingRef.current = setInterval(async () => {
            try {
                const data = await pollTransactions(latestIdRef.current);
                for (const tx of data.transactions) {
                    addTransaction(tx);
                }
            } catch (e) {
                console.error("[Poll] Error:", e);
            }
        }, 2000);
    }, [addTransaction]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            wsRef.current?.close();
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [connectWebSocket]);

    // All transactions for stats, recent ones for display feed
    return {
        transactions: allTransactions,
        recentTransactions: allTransactions.slice(0, displayLimit),
        connectionMode,
    };
}
