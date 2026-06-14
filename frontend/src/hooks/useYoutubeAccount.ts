/**
 * useYoutubeAccount — Custom hook untuk YouTube Identity SSOT
 *
 * Menyimpan pilihan active YouTube account di localStorage agar persisten
 * antar navigasi halaman Analytics (Market Intelligence, Context Pipeline, dll).
 *
 * Usage:
 *   const { activeAccountId, setActiveAccountId, activeAccount, accounts } = useYoutubeAccount();
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveYoutubeAccounts } from '../services/api';
import type { YoutubeAccount } from '../types';

const STORAGE_KEY = 'cf_active_youtube_account_id';

export function useYoutubeAccount(workspaceId?: string) {
    const [activeAccountId, setActiveAccountIdState] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY) || '';
    });

    const { data: accounts = [], isLoading, refetch } = useQuery<YoutubeAccount[]>({
        queryKey: ['youtubeActiveAccounts', workspaceId],
        queryFn: () => getActiveYoutubeAccounts(workspaceId),
        staleTime: 60_000, // 1 menit cache sebelum refetch
    });

    const setActiveAccountId = useCallback((id: string) => {
        setActiveAccountIdState(id);
        if (id) {
            localStorage.setItem(STORAGE_KEY, id);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    /** Objek akun lengkap berdasarkan activeAccountId yang dipilih */
    const activeAccount = useMemo<YoutubeAccount | null>(() => {
        if (!activeAccountId || accounts.length === 0) return null;
        return accounts.find(a => a.id === activeAccountId) ?? null;
    }, [activeAccountId, accounts]);

    /**
     * Validasi: apakah ada akun aktif yang dipilih dan valid.
     * Digunakan untuk disabled state tombol export.
     */
    const hasActiveAccount = Boolean(activeAccountId && activeAccount);

    return {
        activeAccountId,
        setActiveAccountId,
        activeAccount,
        accounts,
        isLoading,
        hasActiveAccount,
        refetch,
    };
}
