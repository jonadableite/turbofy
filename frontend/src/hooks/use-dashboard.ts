"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface DashboardMetrics {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  pixSales: number;
  cardSales: number;
  boletoSales: number;
  approvedPayments: number;
  refundedPayments: number;
  failedPayments: number;
}

interface RevenueData {
  date: string;
  revenue: number;
}

interface HealthMetrics {
  approvedPayments: number;
  refundedPayments: number;
  failedPayments: number;
  chargebackRate: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  revenue: number;
}

export interface PaymentInteractionEntry {
  id: string;
  chargeId?: string | null;
  sessionId?: string | null;
  type: string;
  method?: string | null;
  provider?: string | null;
  amountCents?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
  } | null;
}

export const useDashboard = (merchantId: string) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [interactions, setInteractions] = useState<PaymentInteractionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const REFRESH_MS = 30000;

  const readCache = <T,>(key: string): T | null => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const writeCache = (key: string, value: unknown) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore cache write errors
    }
  };

  useEffect(() => {
    if (!merchantId || merchantId.trim() === "") {
      setLoading(false);
      setError(null);
      return;
    }

    const metricsKey = `dashboard:metrics:${merchantId}`;
    const revenueKey = `dashboard:revenue:${merchantId}`;
    const healthKey = `dashboard:health:${merchantId}`;
    const productsKey = `dashboard:products:${merchantId}`;
    const interactionsKey = `dashboard:interactions:${merchantId}`;

    const cachedMetrics = readCache<DashboardMetrics>(metricsKey);
    const cachedRevenue = readCache<RevenueData[]>(revenueKey);
    const cachedHealth = readCache<HealthMetrics>(healthKey);
    const cachedProducts = readCache<TopProduct[]>(productsKey);
    const cachedInteractions = readCache<PaymentInteractionEntry[]>(interactionsKey);

    const hasCached = Boolean(
      cachedMetrics ||
      (cachedRevenue && cachedRevenue.length) ||
      cachedHealth ||
      (cachedProducts && cachedProducts.length) ||
      (cachedInteractions && cachedInteractions.length)
    );

    if (cachedMetrics) setMetrics(cachedMetrics);
    if (cachedRevenue) setRevenueData(cachedRevenue);
    if (cachedHealth) setHealthMetrics(cachedHealth);
    if (cachedProducts) setTopProducts(cachedProducts || []);
    if (cachedInteractions) setInteractions(cachedInteractions);

    setLoading(!hasCached);
    setError(null);

    const fetchDashboardData = async () => {
      try {
        const [metricsRes, revenueRes, healthRes, productsRes, interactionsRes] = await Promise.all([
          api.get(`/dashboard/metrics?merchantId=${merchantId}`),
          api.get(`/dashboard/revenue-history?merchantId=${merchantId}`),
          api.get(`/dashboard/health?merchantId=${merchantId}`),
          api.get(`/dashboard/top-products?merchantId=${merchantId}&limit=3`),
          api.get(`/dashboard/interactions?merchantId=${merchantId}&limit=25`),
        ]);

        setMetrics(metricsRes.data);
        setRevenueData(revenueRes.data);
        setHealthMetrics(healthRes.data);
        setTopProducts(productsRes.data);
        setInteractions(interactionsRes.data);

        writeCache(metricsKey, metricsRes.data);
        writeCache(revenueKey, revenueRes.data);
        writeCache(healthKey, healthRes.data);
        writeCache(productsKey, productsRes.data);
        writeCache(interactionsKey, interactionsRes.data);
        setError(null);
      } catch (err: unknown) {
        const message = typeof err === "object" && err && (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message;
        setError(message || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const id = setInterval(fetchDashboardData, REFRESH_MS);
    return () => clearInterval(id);
  }, [merchantId]);

  return {
    metrics,
    revenueData,
    healthMetrics,
    topProducts,
    interactions,
    loading,
    error,
  };
};

