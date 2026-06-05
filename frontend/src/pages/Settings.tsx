import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGCPProfiles, getConfig } from '../services/api';
import { Server, Cloud, FolderTree, KeyRound, Loader2, X } from 'lucide-react';

export default function Settings() {
    const { data: profiles = [] } = useQuery({ queryKey: ['gcp-profiles'], queryFn: getGCPProfiles });
    const { data: config, isLoading: isConfigLoading } = useQuery({ queryKey: ['config'], queryFn: getConfig });
    const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);

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
                            <p className="text-xs text-muted-foreground mt-1">Base URL tanpa path. Contoh: http://localhost:20128</p>
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
                                    placeholder="e.g. My Main Account" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Client ID</label>
                                <input 
                                    type="text" 
                                    placeholder="Your GCP Client ID" 
                                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Client Secret</label>
                                <input 
                                    type="password" 
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
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md"
                            >
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
