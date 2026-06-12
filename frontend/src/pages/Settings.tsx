import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getGCPProfiles, 
    getConfig, 
    createGCPProfile, 
    getSystemSettings, 
    updateSystemSettings, 
    getGenerationModels, 
    createGenerationModel, 
    deleteGenerationModel 
} from '../services/api';
import { Server, Cloud, FolderTree, KeyRound, Loader2, X, Sliders, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
    const queryClient = useQueryClient();
    const { data: profiles = [] } = useQuery({ queryKey: ['gcp-profiles'], queryFn: getGCPProfiles });
    const { data: config, isLoading: isConfigLoading } = useQuery({ queryKey: ['config'], queryFn: getConfig });
    const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');

    const createMutation = useMutation({
        mutationFn: createGCPProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gcp-profiles'] });
            setIsAddProfileOpen(false);
            setName('');
            setClientId('');
            setClientSecret('');
        }
    });

    const handleSave = () => {
        if (!name || !clientId || !clientSecret) return;
        createMutation.mutate({ name, client_id: clientId, client_secret: clientSecret });
    };

    // Direct Single Model states
    const [singleModelEndpoint, setSingleModelEndpoint] = useState('');
    const [singleModelApiKey, setSingleModelApiKey] = useState('');
    const [newModelName, setNewModelName] = useState('');

    // 9Router Safeguard states
    const [nineRouterTimeout, setNineRouterTimeout] = useState(60);
    const [nineRouterMaxTokens, setNineRouterMaxTokens] = useState(4000);
    const [nineRouterStripJsonMode, setNineRouterStripJsonMode] = useState(true);
    const [nineRouterStripPenalties, setNineRouterStripPenalties] = useState(true);
    const [nineRouterConvertSystemToUser, setNineRouterConvertSystemToUser] = useState(false);

    const { data: systemSettings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: getSystemSettings
    });

    const { data: dbModels = [] } = useQuery({
        queryKey: ['generation-models'],
        queryFn: getGenerationModels
    });

    useEffect(() => {
        if (systemSettings) {
            setSingleModelEndpoint(systemSettings.single_model_endpoint);
            setSingleModelApiKey(systemSettings.single_model_api_key);
            setNineRouterTimeout(systemSettings.nine_router_timeout ?? 60);
            setNineRouterMaxTokens(systemSettings.nine_router_max_tokens ?? 4000);
            setNineRouterStripJsonMode(systemSettings.nine_router_strip_json_mode ?? true);
            setNineRouterStripPenalties(systemSettings.nine_router_strip_penalties ?? true);
            setNineRouterConvertSystemToUser(systemSettings.nine_router_convert_system_to_user ?? false);
        }
    }, [systemSettings]);

    const updateSettingsMutation = useMutation({
        mutationFn: updateSystemSettings,
        onSuccess: () => {
            toast.success("System settings updated successfully");
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
        },
        onError: (err: any) => {
            toast.error(`Failed to update settings: ${err.message}`);
        }
    });

    const addModelMutation = useMutation({
        mutationFn: createGenerationModel,
        onSuccess: () => {
            toast.success("Model added successfully");
            setNewModelName('');
            queryClient.invalidateQueries({ queryKey: ['generation-models'] });
        },
        onError: (err: any) => {
            toast.error(`Failed to add model: ${err.response?.data?.detail || err.message}`);
        }
    });

    const deleteModelMutation = useMutation({
        mutationFn: deleteGenerationModel,
        onSuccess: () => {
            toast.success("Model removed successfully");
            queryClient.invalidateQueries({ queryKey: ['generation-models'] });
        },
        onError: (err: any) => {
            toast.error(`Failed to remove model: ${err.message}`);
        }
    });

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold mb-2">System Settings</h1>
                <p className="text-muted-foreground">Manage external connections, AI configs, and storage.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-lg pb-2 border-b border-border">
                        <Server className="w-5 h-5 text-primary" /> 9Router Configuration
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground mb-1">9Router Base URL</p>
                            <p className="font-medium bg-secondary px-3 py-2 rounded flex items-center h-9">
                                {isConfigLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (config?.nine_router_url || 'Not configured')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Base URL tanpa path. Contoh: http://api.example.com</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-1">AI Model (Fallback)</p>
                            <p className="font-medium bg-secondary px-3 py-2 rounded flex items-center h-9">
                                {isConfigLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (config?.nine_router_model || 'Not configured')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-lg pb-2 border-b border-border">
                        <Sliders className="w-5 h-5 text-indigo-500" /> Direct Single Model API Settings
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-4">
                            <div>
                                <label className="text-muted-foreground block mb-1 font-medium">Single Model API Endpoint</label>
                                <input 
                                    type="text"
                                    value={singleModelEndpoint}
                                    onChange={(e) => setSingleModelEndpoint(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                                    placeholder="http://ip:port/v1/images/generations"
                                />
                                <p className="text-xs text-muted-foreground mt-1">URL endpoint target untuk generasi gambar model tunggal.</p>
                            </div>
                            <div>
                                <label className="text-muted-foreground block mb-1 font-medium">API Authorization Key (Key)</label>
                                <input 
                                    type="password"
                                    value={singleModelApiKey}
                                    onChange={(e) => setSingleModelApiKey(e.target.value)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                                    placeholder="sk-..."
                                />
                                <p className="text-xs text-muted-foreground mt-1">Token otorisasi jika API memerlukan autentikasi Bearer.</p>
                            </div>
                            <button
                                onClick={() => updateSettingsMutation.mutate({
                                    single_model_endpoint: singleModelEndpoint,
                                    single_model_api_key: singleModelApiKey,
                                    nine_router_timeout: nineRouterTimeout,
                                    nine_router_max_tokens: nineRouterMaxTokens,
                                    nine_router_strip_json_mode: nineRouterStripJsonMode,
                                    nine_router_strip_penalties: nineRouterStripPenalties,
                                    nine_router_convert_system_to_user: nineRouterConvertSystemToUser
                                })}
                                disabled={updateSettingsMutation.isPending}
                                className="bg-indigo-600 text-white font-medium px-4 py-2 rounded-md text-xs hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {updateSettingsMutation.isPending ? "Saving Settings..." : "Save Settings"}
                            </button>
                        </div>

                        <div className="space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                            <h3 className="font-semibold text-sm text-foreground">Manage Available Models</h3>
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                    placeholder="Model Name (e.g. Flux.1)"
                                    className="flex-1 bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                    onClick={() => {
                                        if (newModelName.trim()) {
                                            addModelMutation.mutate({ name: newModelName.trim() });
                                        }
                                    }}
                                    disabled={addModelMutation.isPending || !newModelName.trim()}
                                    className="bg-primary text-primary-foreground font-medium px-3 py-1.5 rounded-md text-xs hover:opacity-90 transition disabled:opacity-50 shrink-0"
                                >
                                    Add Model
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {dbModels.map(m => (
                                    <div key={m.id} className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded border border-border/60 hover:border-border transition text-xs">
                                        <span className="font-medium text-foreground">{m.name}</span>
                                        <button 
                                            onClick={() => deleteModelMutation.mutate(m.id)}
                                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                            title="Delete Model"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {dbModels.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic py-1">No custom models configured.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-lg pb-2 border-b border-border">
                        <Sliders className="w-5 h-5 text-indigo-500" /> 9Router Adapter & Safe-guard Settings
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-4">
                            <div>
                                <label className="text-muted-foreground block mb-1 font-medium">9Router Default Timeout (Seconds)</label>
                                <input 
                                    type="number"
                                    value={nineRouterTimeout}
                                    onChange={(e) => setNineRouterTimeout(parseInt(e.target.value) || 60)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                                    placeholder="60"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Batas waktu (timeout) dalam detik untuk request ke 9Router.</p>
                            </div>
                            <div>
                                <label className="text-muted-foreground block mb-1 font-medium">9Router Max Tokens Cap</label>
                                <input 
                                    type="number"
                                    value={nineRouterMaxTokens}
                                    onChange={(e) => setNineRouterMaxTokens(parseInt(e.target.value) || 4000)}
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                                    placeholder="4000"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Batas maksimum token output yang diizinkan untuk dikirim ke model target.</p>
                            </div>
                        </div>

                        <div className="space-y-4 md:border-l border-border md:pl-6">
                            <h3 className="font-semibold text-sm text-foreground">Compatibility Adapters</h3>
                            
                            <div className="flex items-center gap-2.5">
                                <input 
                                    type="checkbox" 
                                    id="stripJsonMode"
                                    checked={nineRouterStripJsonMode}
                                    onChange={(e) => setNineRouterStripJsonMode(e.target.checked)}
                                    className="rounded border-border bg-background cursor-pointer"
                                />
                                <label htmlFor="stripJsonMode" className="text-xs font-medium text-foreground cursor-pointer">
                                    Strip JSON Mode for non-GPT models
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed -mt-2.5">
                                Menghapus parameter <code>response_format</code> secara otomatis pada model target non-OpenAI untuk mencegah Error 400.
                            </p>

                            <div className="flex items-center gap-2.5">
                                <input 
                                    type="checkbox" 
                                    id="stripPenalties"
                                    checked={nineRouterStripPenalties}
                                    onChange={(e) => setNineRouterStripPenalties(e.target.checked)}
                                    className="rounded border-border bg-background cursor-pointer"
                                />
                                <label htmlFor="stripPenalties" className="text-xs font-medium text-foreground cursor-pointer">
                                    Strip penalty parameters for non-GPT models
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed -mt-2.5">
                                Menghapus parameter <code>presence_penalty</code> dan <code>frequency_penalty</code> pada model target non-OpenAI.
                            </p>

                            <div className="flex items-center gap-2.5">
                                <input 
                                    type="checkbox" 
                                    id="convertSystem"
                                    checked={nineRouterConvertSystemToUser}
                                    onChange={(e) => setNineRouterConvertSystemToUser(e.target.checked)}
                                    className="rounded border-border bg-background cursor-pointer"
                                />
                                <label htmlFor="convertSystem" className="text-xs font-medium text-foreground cursor-pointer">
                                    Convert system role to user role
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed -mt-2.5">
                                Mengonversi pesan ber-role system ke pesan user biasa secara otomatis untuk model yang tidak mendukung role system.
                            </p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-end">
                        <button
                            onClick={() => updateSettingsMutation.mutate({
                                single_model_endpoint: singleModelEndpoint,
                                single_model_api_key: singleModelApiKey,
                                nine_router_timeout: nineRouterTimeout,
                                nine_router_max_tokens: nineRouterMaxTokens,
                                nine_router_strip_json_mode: nineRouterStripJsonMode,
                                nine_router_strip_penalties: nineRouterStripPenalties,
                                nine_router_convert_system_to_user: nineRouterConvertSystemToUser
                            })}
                            disabled={updateSettingsMutation.isPending}
                            className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md text-xs hover:opacity-90 transition disabled:opacity-50"
                        >
                            {updateSettingsMutation.isPending ? "Saving Settings..." : "Save Settings"}
                        </button>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <Cloud className="w-5 h-5 text-blue-400" /> GCP OAuth Profiles
                        </div>
                        <button 
                            onClick={() => setIsAddProfileOpen(true)}
                            className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded font-medium"
                        >
                            Add Profile
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {profiles.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-secondary/50 p-3 rounded border border-border">
                                <div>
                                    <p className="font-medium flex items-center gap-2">{p.name} <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span></p>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><KeyRound className="w-3 h-3" /> {p.client_id.substring(0, 20)}...</p>
                                </div>
                                <button className="text-sm text-muted-foreground hover:text-foreground">Edit</button>
                            </div>
                        ))}
                        {profiles.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">No GCP Profiles configured.</p>
                        )}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-lg pb-2 border-b border-border">
                        <FolderTree className="w-5 h-5 text-yellow-500" /> Local Storage Paths
                    </div>
                    <div className="space-y-2 text-sm font-mono text-muted-foreground bg-secondary/30 p-4 rounded-md border border-border">
                        <p>ROOT: <span className="text-foreground">../data/</span></p>
                        <p>├─ channels/ <span className="text-xs italic">- Auto-generates per channel slug</span></p>
                        <p>│  ├─ /assets/ (thumbnails, footage, prompts)</p>
                        <p>│  └─ /uploads/ (pending, scheduled, published, failed)</p>
                        <p>├─ shared-assets/ <span className="text-xs italic">- Global fallback assets</span></p>
                        <p>└─ temp/ <span className="text-xs italic">- Auto-purged every 24 hours</span></p>
                    </div>
                </div>
            </div>

            {/* Add Profile Modal */}
            {isAddProfileOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="font-semibold text-lg">Add GCP Profile</h2>
                            <button 
                                onClick={() => setIsAddProfileOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Profile Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. My Main Account" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Client ID</label>
                                <input 
                                    type="text" 
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    placeholder="Your GCP Client ID" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Client Secret</label>
                                <input 
                                    type="password" 
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    placeholder="Your GCP Client Secret" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-border flex justify-end gap-2">
                            <button 
                                onClick={() => setIsAddProfileOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={createMutation.isPending || !name || !clientId || !clientSecret}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                            >
                                {createMutation.isPending ? "Saving..." : "Save Profile"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
