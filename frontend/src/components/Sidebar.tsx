import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MonitorPlay, Image as ImageIcon, UploadCloud, Settings, Sparkles, Layers, BookMarked } from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getUploadJobs } from '../services/api';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Channels', icon: MonitorPlay, path: '/channels' },
    { label: 'Prompt Contexts', icon: Sparkles, path: '/prompts' },
    { label: 'Combos', icon: Layers, path: '/generation-combos' },
    { label: 'Metadata Library', icon: BookMarked, path: '/metadata-library' },
    { label: 'Assets', icon: ImageIcon, path: '/assets' },
    { label: 'Uploads', icon: UploadCloud, path: '/uploads' },
    { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
    const { data: uploads = [] } = useQuery({ queryKey: ['uploads'], queryFn: () => getUploadJobs(), refetchInterval: 10000 });
    const pendingCount = uploads.filter((u: any) => u.status === 'pending' || u.status === 'uploading').length;

    return (
        <aside className="w-64 border-r border-border bg-card flex flex-col h-full">
            <div className="p-6 border-b border-border">
                <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <MonitorPlay className="text-destructive" /> 
                    Content Factory
                </h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                                isActive ? "bg-secondary text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-primary"
                            )}
                        >
                            <Icon className="w-5 h-5 mr-3" />
                            <span className="font-medium">{item.label}</span>
                            {item.label === 'Uploads' && pendingCount > 0 && (
                                <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {pendingCount}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}
