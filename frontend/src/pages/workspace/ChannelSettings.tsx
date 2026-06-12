import { Info, PlaySquare, Plug, AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, updateChannel, connectOAuth, disconnectOAuth, getExternalAccounts, createExternalAccount, updateExternalAccount, deleteExternalAccount } from '../../services/api';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import PromptAssignmentManager from '../../components/PromptAssignmentManager';

export default function ChannelSettings() {
    const { slug } = useParams();
    const queryClient = useQueryClient();
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    
    const currentChannel = channels.find(c => c.slug === slug);

    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (currentChannel) {
            setName(currentChannel.name);
            setIsActive(currentChannel.is_active === 1);
        }
    }, [currentChannel]);

    // External Accounts queries and state
    const { data: externalAccounts = [], refetch: refetchAccounts } = useQuery({
        queryKey: ['external-accounts', currentChannel?.slug],
        queryFn: () => getExternalAccounts(currentChannel?.slug),
        enabled: !!currentChannel?.slug
    });

    const [provider, setProvider] = useState('Google Flow');
    const [accountName, setAccountName] = useState('');
    const [profileName, setProfileName] = useState('');

    const addAccountMutation = useMutation({
        mutationFn: () => createExternalAccount({
            workspace_id: currentChannel!.slug,
            provider,
            account_name: accountName,
            profile_name: profileName || undefined
        }),
        onSuccess: () => {
            toast.success('External account added');
            setAccountName('');
            setProfileName('');
            refetchAccounts();
        },
        onError: () => toast.error('Failed to add external account')
    });

    const toggleAccountMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            updateExternalAccount(id, { is_active: isActive ? 1 : 0 }),
        onSuccess: () => {
            toast.success('Account status updated');
            refetchAccounts();
        },
        onError: () => toast.error('Failed to update account status')
    });

    const deleteAccountMutation = useMutation({
        mutationFn: (id: string) => deleteExternalAccount(id),
        onSuccess: () => {
            toast.success('External account deleted');
            refetchAccounts();
        },
        onError: () => toast.error('Failed to delete external account')
    });

    const updateMutation = useMutation({
        mutationFn: () => updateChannel(currentChannel!.id, { name, is_active: isActive ? 1 : 0 }),
        onSuccess: () => {
            toast.success('Channel settings updated');
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
        onError: () => toast.error('Failed to update channel')
    });

    const connectOAuthMutation = useMutation({
        mutationFn: () => connectOAuth({ channel_id: currentChannel!.id }),
        onSuccess: (data) => {
            const width = 600;
            const height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            window.open(data.url, 'YouTube OAuth', `width=${width},height=${height},top=${top},left=${left}`);
            
            // Poll for updates (simplified for now by just letting user refresh or we invalidate after a timeout)
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['channels'] });
            }, 5000);
        },
        onError: () => toast.error('Failed to initiate OAuth')
    });

    const disconnectOAuthMutation = useMutation({
        mutationFn: () => disconnectOAuth({ channel_id: currentChannel!.id }),
        onSuccess: () => {
            toast.success('OAuth disconnected successfully');
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
        onError: () => toast.error('Failed to disconnect OAuth')
    });

    if (!currentChannel) return null;

    const handleSaveInfo = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate();
    };

    const isOAuthConnected = currentChannel.oauth_status === 'OAuth Connected';

    return (
        <div className="space-y-8 max-w-4xl pb-10">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Channel Settings</h1>
                <p className="text-muted-foreground mt-1 text-sm">Configure channel identity, metadata profiles, and API connections.</p>
            </div>

            {/* Channel Information */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Channel Information</h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSaveInfo} className="space-y-4 max-w-lg">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Channel Name</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-2 opacity-60">
                            <label className="text-sm font-medium">Channel Slug</label>
                            <input 
                                type="text"
                                value={currentChannel.slug}
                                disabled
                                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground">The slug is used for routing and cannot be changed.</p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="isActive"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="rounded border-border bg-background"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium">Channel is active</label>
                        </div>
                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* OAuth Management */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                    <PlaySquare className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-lg">YouTube API Connection</h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between max-w-2xl">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Connection Status</span>
                                {isOAuthConnected ? (
                                    <span className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Connected
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Disconnected
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isOAuthConnected 
                                    ? "Content Factory can upload and manage videos on your behalf." 
                                    : "Connect your YouTube account to enable automatic publishing."}
                            </p>
                        </div>
                        <div>
                            {isOAuthConnected ? (
                                <button 
                                    onClick={() => {
                                        if (confirm('Are you sure you want to disconnect? Publishing will be disabled.')) {
                                            disconnectOAuthMutation.mutate();
                                        }
                                    }}
                                    disabled={disconnectOAuthMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                                >
                                    {disconnectOAuthMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                                    Disconnect OAuth
                                </button>
                            ) : (
                                <button 
                                    onClick={() => connectOAuthMutation.mutate()}
                                    disabled={connectOAuthMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors"
                                >
                                    {connectOAuthMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                                    Connect YouTube
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* External Accounts Connection Manager */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
                    <Plug className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-lg">External Connector Accounts</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Add Account Form */}
                        <div className="space-y-4 border border-border/60 p-4 rounded-lg bg-muted/10">
                            <h4 className="font-medium text-sm text-foreground/90">Add External Account</h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Provider</label>
                                    <select
                                        value={provider}
                                        onChange={e => setProvider(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none"
                                    >
                                        <option value="Google Flow">Google Flow</option>
                                        <option value="Gemini">Gemini</option>
                                        <option value="ChatGPT">ChatGPT</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Account Name / Email</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Gmail A or My GPT"
                                        value={accountName}
                                        onChange={e => setAccountName(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Profile Name (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Chrome Profile 1"
                                        value={profileName}
                                        onChange={e => setProfileName(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!accountName) {
                                            toast.error("Account Name is required");
                                            return;
                                        }
                                        addAccountMutation.mutate();
                                    }}
                                    disabled={addAccountMutation.isPending}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-1.5 px-3 rounded-md text-xs font-semibold disabled:opacity-50"
                                >
                                    {addAccountMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add Account"}
                                </button>
                            </div>
                        </div>

                        {/* Accounts List */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm text-foreground/90">Linked Accounts ({externalAccounts.length})</h4>
                            {externalAccounts.length === 0 ? (
                                <p className="text-xs italic text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                                    No external accounts linked to this channel. Add one to enable Flow/external asset source integrations.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                    {externalAccounts.map((account) => (
                                        <div key={account.id} className="flex items-center justify-between p-3 border border-border/80 rounded-lg hover:border-border transition-colors bg-secondary/15">
                                            <div className="space-y-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold truncate text-foreground">{account.account_name}</span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{account.provider}</span>
                                                </div>
                                                {account.profile_name && (
                                                    <p className="text-xs text-muted-foreground truncate">Profile: {account.profile_name}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Toggle is_active */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAccountMutation.mutate({ id: account.id, isActive: account.is_active !== 1 })}
                                                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                                        account.is_active === 1
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                                                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                                                    }`}
                                                >
                                                    {account.is_active === 1 ? "Active" : "Inactive"}
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm("Delete this linked account?")) {
                                                            deleteAccountMutation.mutate(account.id);
                                                        }
                                                    }}
                                                    className="text-xs text-red-400 hover:text-red-300 transition-colors p-1"
                                                    title="Remove connection"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Future Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden opacity-60">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <h3 className="font-semibold">Upload Preferences</h3>
                        <span className="text-[10px] font-bold uppercase bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">Planned Feature</span>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-muted-foreground">Configure default privacy status (Public, Private, Unlisted), tags, and category for all videos in this channel.</p>
                    </div>
                </div>

                {/* Prompt Assignment Manager */}
                <PromptAssignmentManager channelId={currentChannel.id} />

                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden opacity-60">
                    <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                        <h3 className="font-semibold">Publishing Defaults</h3>
                        <span className="text-[10px] font-bold uppercase bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">Planned Feature</span>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-muted-foreground">Set automatic scheduling behaviors, preferred publish times, and playlist assignments.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
