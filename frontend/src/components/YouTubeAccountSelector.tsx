/**
 * YouTubeAccountSelector — Global selector untuk YouTube Identity SSOT
 *
 * Komponen ini digunakan di header halaman Analytics (Market Intelligence,
 * Context Pipeline) sebagai pengganti dropdown channel lokal per-halaman.
 *
 * Props:
 *   - activeAccountId: string — ID akun yang sedang dipilih
 *   - setActiveAccountId: (id: string) => void — setter
 *   - accounts: YoutubeAccount[] — list akun dari hook
 *   - isLoading: boolean — loading state
 *   - showSyncButton?: boolean — tampilkan tombol sync (default false)
 *   - onSync?: () => void — callback sync
 */
import { Play, ChevronDown, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import type { YoutubeAccount } from '../types';

interface Props {
    activeAccountId: string;
    setActiveAccountId: (id: string) => void;
    accounts: YoutubeAccount[];
    isLoading?: boolean;
    showSyncButton?: boolean;
    onSync?: () => void;
    isSyncing?: boolean;
    className?: string;
}

export default function YouTubeAccountSelector({
    activeAccountId,
    setActiveAccountId,
    accounts,
    isLoading = false,
    showSyncButton = false,
    onSync,
    isSyncing = false,
    className = '',
}: Props) {
    const selectedAccount = accounts.find(a => a.id === activeAccountId) ?? null;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Icon + Label */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                <Play className="w-4 h-4 text-red-500 fill-red-500" />
                <span>Active Account:</span>
            </div>

            {/* Selector Dropdown */}
            <div className="relative">
                <div className="flex items-center bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    {/* Status dot */}
                    <div className="pl-2.5 pr-1 flex items-center">
                        {selectedAccount ? (
                            <Wifi className="w-3 h-3 text-emerald-500" />
                        ) : (
                            <WifiOff className="w-3 h-3 text-muted-foreground/50" />
                        )}
                    </div>

                    <select
                        id="youtube-account-selector"
                        className="bg-transparent text-xs font-medium pr-7 pl-1 py-2 focus:outline-none cursor-pointer text-foreground min-w-[180px] max-w-[240px] appearance-none"
                        value={activeAccountId}
                        onChange={e => setActiveAccountId(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="" className="bg-card text-foreground">
                            {isLoading ? 'Loading accounts...' : '— Select YouTube Account —'}
                        </option>
                        {accounts.map(account => (
                            <option key={account.id} value={account.id} className="bg-card text-foreground">
                                {account.youtube_channel_title}
                                {account.youtube_handle ? ` (@${account.youtube_handle.replace('@', '')})` : ''}
                            </option>
                        ))}
                    </select>

                    {/* Chevron icon */}
                    <div className="pointer-events-none pr-2.5">
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                </div>
            </div>

            {/* No accounts warning */}
            {!isLoading && accounts.length === 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>No accounts linked. Complete OAuth in Channels.</span>
                </div>
            )}

            {/* Optional Sync Button */}
            {showSyncButton && onSync && (
                <button
                    onClick={onSync}
                    disabled={isSyncing}
                    title="Sync channels to YouTube identity registry"
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
            )}
        </div>
    );
}
