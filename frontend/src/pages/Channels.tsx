import { useQuery } from '@tanstack/react-query';
import { getChannels } from '../services/api';
import { PlusCircle, MonitorPlay, KeyRound } from 'lucide-react';

export default function Channels() {
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });

    const handleConnectOAuth = (slug: string) => {
        window.location.href = `http://localhost:8000/api/oauth/connect?channel_slug=${slug}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Channels</h1>
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Add Channel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map(channel => (
                    <div key={channel.id} className="bg-card border border-border p-6 rounded-lg shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                                    <MonitorPlay className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{channel.name}</h3>
                                    <p className="text-sm text-muted-foreground">/{channel.slug}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${channel.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                {channel.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {channel.description || "No description provided."}
                        </p>

                        <div className="pt-4 border-t border-border flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <KeyRound className="w-4 h-4" />
                                {channel.gcp_profile_id ? 'OAuth Connected' : 'Disconnected'}
                            </span>
                            {!channel.gcp_profile_id && (
                                <button 
                                    onClick={() => handleConnectOAuth(channel.slug)}
                                    className="text-xs bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded font-medium transition-colors"
                                >
                                    Connect OAuth
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {channels.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-lg border-dashed">
                        No channels found. Click "Add Channel" to start.
                    </div>
                )}
            </div>
        </div>
    );
}
