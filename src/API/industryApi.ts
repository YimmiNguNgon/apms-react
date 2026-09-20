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

export const industryApi = {
  getIndustries: async (search?: string, forceRefresh = false): Promise<IndustryCatalogResponse[]> => {
    if (!search && cachedCatalog && !forceRefresh) {
      return cachedCatalog;
    }
    if (!search && catalogPromise && !forceRefresh) {
      return catalogPromise;
    }

    const fetcher = api.get<IndustryCatalogResponse[]>('/reference-data/industries', {
      params: search ? { search: search.trim() } : undefined,
    }).then(res => {
      if (!search) {
        cachedCatalog = res.data;
        catalogPromise = null;
      }
      return res.data;
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

export const useIndustryCatalog = () => {
  const [catalog, setCatalog] = useState<IndustryCatalogResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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
    refresh: () => fetchCatalog(true),
    isCatalogIndustry,
    findCatalogMatch,
  };
};

