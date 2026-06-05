import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAssets, getChannels } from '../services/api';
import { FileText, FileVideo, Download, UploadCloud } from 'lucide-react';

export default function Assets() {
    const [selectedChannel, setSelectedChannel] = useState<string>('shared');
    const [filterType, setFilterType] = useState<string>('all');
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });
    const { data: assets = [], isFetching } = useQuery({ 
        queryKey: ['assets', selectedChannel], 
        queryFn: () => getAssets(selectedChannel) 
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Asset Library</h1>
                <select 
                    className="bg-card border border-border text-sm rounded-md px-3 py-2"
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                >
                    <option value="shared">Shared Assets</option>
                    {channels.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <select 
                    className="bg-card border border-border text-sm rounded-md px-3 py-2"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">All Types</option>
                    <option value="thumbnail">Thumbnails</option>
                    <option value="footage">Footage</option>
                    <option value="prompt">Prompts</option>
                </select>
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-card hover:bg-secondary/20 transition-colors cursor-pointer">
                <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium">Drag & Drop files here</h3>
                <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG, MP4, and TXT (Max 50MB)</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                {assets.filter(a => filterType === 'all' || a.type === filterType).map(asset => {
                    const slug = channels.find(c => c.id === asset.channel_id)?.slug || 'shared';
                    const imgUrl = `http://localhost:8000/data/channels/${slug}/assets/${asset.type}s/${asset.filename}`;

                    return (
                    <div key={asset.id} className="bg-card border border-border rounded-lg overflow-hidden group">
                        <div className="h-32 bg-secondary flex items-center justify-center relative">
                            {asset.type === 'thumbnail' ? (
                                <img src={imgUrl} alt={asset.filename} className="w-full h-full object-cover" />
                            ) : asset.type === 'prompt' ? (
                                <FileText className="w-10 h-10 text-muted-foreground" />
                            ) : (
                                <FileVideo className="w-10 h-10 text-muted-foreground" />
                            )}
                             
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={imgUrl} download className="bg-primary text-primary-foreground p-2 rounded-full">
                                    <Download className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                        <div className="p-3">
                            <p className="text-sm font-medium truncate" title={asset.filename}>{asset.filename}</p>
                            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{asset.type}</p>
                        </div>
                    </div>
                )})}
                {!isFetching && assets.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        No assets found for this selection.
                    </div>
                )}
            </div>
        </div>
    );
}
