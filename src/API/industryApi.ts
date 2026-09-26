import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { IndustryCatalogResponse } from '../types/domain';

let cachedCatalog: IndustryCatalogResponse[] | null = null;
let catalogPromise: Promise<IndustryCatalogResponse[]> | null = null;

export const normalizeIndustryName = (name: string): string => {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
};

export const cleanIndustryDisplayName = (name: string): string => {
  return (name || '').trim().replace(/\s+/g, ' ');
};

const unwrapStringArray = (res: any): string[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && Array.isArray(res.data.content)) return res.data.content;
  if (res.data && Array.isArray(res.data.items)) return res.data.items;
  return [];
};

export const industryApi = {
  getIndustries: async (search?: string, forceRefresh = false): Promise<IndustryCatalogResponse[]> => {
    if (!search && cachedCatalog && !forceRefresh) {
      return cachedCatalog;
    }
    if (!search && catalogPromise && !forceRefresh) {
      return catalogPromise;
    }

    const fetcher = (async (): Promise<IndustryCatalogResponse[]> => {
      // 1. Primary: Load existing distinct industries from company profiles (/profiles/industries)
      try {
        const res = await api.get<any>('/profiles/industries');
        const rawStrings = unwrapStringArray(res);
        if (rawStrings.length > 0) {
          return rawStrings.filter(Boolean).map(name => ({
            id: name,
            name: cleanIndustryDisplayName(name),
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch from /profiles/industries, trying /reference-data/industries fallback', err);
      }

      // 2. Fallback: reference-data endpoint
      try {
        const refRes = await api.get<any>('/reference-data/industries', {
          params: search ? { search: search.trim() } : undefined,
        });
        const refData = refRes?.data ?? refRes;
        if (Array.isArray(refData)) {
          return refData;
        }
        if (refData && Array.isArray(refData.data)) {
          return refData.data;
        }
        if (refData && Array.isArray(refData.content)) {
          return refData.content;
        }
      } catch (err) {
        console.warn('Failed to fetch from /reference-data/industries', err);
      }

      return [];
    })().then((data: IndustryCatalogResponse[]) => {
      // Case-insensitive deduplication and whitespace cleanup
      const map = new Map<string, IndustryCatalogResponse>();
      data.forEach((item: IndustryCatalogResponse) => {
        if (!item || !item.name) return;
        const clean = cleanIndustryDisplayName(item.name);
        if (!clean) return;
        const key = normalizeIndustryName(clean);
        if (key && !map.has(key)) {
          map.set(key, { id: item.id || clean, name: clean });
        }
      });
      const sorted = Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );

      if (!search) {
        cachedCatalog = sorted;
        catalogPromise = null;
        return sorted;
      }

      const q = search.trim().toLowerCase();
      return sorted.filter(item => item.name.toLowerCase().includes(q));
    }).catch(err => {
      if (!search) {
        catalogPromise = null;
      }
      throw err;
    });

    if (!search) {
      catalogPromise = fetcher;
    }
    return fetcher;
  },

  invalidateCache: () => {
    cachedCatalog = null;
    catalogPromise = null;
  },
};

export const useIndustryCatalog = (autoFetch = true) => {
  const [catalog, setCatalog] = useState<IndustryCatalogResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await industryApi.getIndustries(undefined, force);
      setCatalog(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load industry catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchCatalog(true);
  }, [fetchCatalog]);

  useEffect(() => {
    if (autoFetch) {
      fetchCatalog(false);
    }
  }, [autoFetch, fetchCatalog]);

  const isCatalogIndustry = useCallback((name: string): boolean => {
    if (!name) return false;
    const norm = normalizeIndustryName(name);
    return catalog.some(c => normalizeIndustryName(c.name) === norm);
  }, [catalog]);

  const findCatalogMatch = useCallback((name: string): IndustryCatalogResponse | undefined => {
    if (!name) return undefined;
    const norm = normalizeIndustryName(name);
    return catalog.find(c => normalizeIndustryName(c.name) === norm);
  }, [catalog]);

  return {
    catalog,
    loading,
    error,
    refresh,
    fetchCatalog,
    isCatalogIndustry,
    findCatalogMatch,
  };
};

