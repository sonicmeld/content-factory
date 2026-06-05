import { useQuery } from '@tanstack/react-query';
import { getGCPProfiles } from '../services/api';
import { Server, Cloud, FolderTree, KeyRound } from 'lucide-react';

export default function Settings() {
    const { data: profiles = [] } = useQuery({ queryKey: ['gcp-profiles'], queryFn: getGCPProfiles });

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
                            <p className="text-muted-foreground mb-1">API URL Endpoint</p>
                            <p className="font-medium bg-secondary px-3 py-2 rounded">https://api.9router.com/v1/chat/completions</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-1">AI Model (Fallback)</p>
                            <p className="font-medium bg-secondary px-3 py-2 rounded">gpt-3.5-turbo</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <Cloud className="w-5 h-5 text-blue-400" /> GCP OAuth Profiles
                        </div>
                        <button className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded font-medium">Add Profile</button>
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
        </div>
    );
}
