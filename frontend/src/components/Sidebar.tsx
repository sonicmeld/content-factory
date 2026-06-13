import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    MonitorPlay,
    Image as ImageIcon,
    UploadCloud,
    Settings,
    Sparkles,
    Layers,
    BookMarked,
    ActivitySquare,
    TrendingUp,
    Rocket,
    Tv2,
    BarChart3,
    Plug,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getUploadJobs } from '../services/api';

type NavItem = {
    label: string;
    icon: React.ElementType;
    path: string;
    disabled?: boolean;
};

type DomainGroup = {
    domain: string;
    icon: React.ElementType;
    items: NavItem[];
};

const domainGroups: DomainGroup[] = [
    {
        domain: 'Analytics Domain',
        icon: BarChart3,
        items: [
            { label: 'Analytics Hub', icon: TrendingUp, path: '/analytics', disabled: true },
        ],
    },
    {
        domain: 'Prompt Domain',
        icon: Sparkles,
        items: [
            { label: 'Prompt Library', icon: Sparkles, path: '/prompts' },
            { label: 'Generation Combos', icon: Layers, path: '/generation-combos' },
            { label: 'Metadata Library', icon: BookMarked, path: '/metadata-library' },
        ],
    },
    {
        domain: 'Production Domain',
        icon: Rocket,
        items: [
            { label: 'Execution Center', icon: ActivitySquare, path: '/execution-center' },
            { label: 'Assets', icon: ImageIcon, path: '/assets' },
            { label: 'Uploads', icon: UploadCloud, path: '/uploads' },
        ],
    },
    {
        domain: 'Channel Domain',
        icon: Tv2,
        items: [
            { label: 'Channels', icon: MonitorPlay, path: '/channels' },
        ],
    },
    {
        domain: 'Platform',
        icon: Settings,
        items: [
            { label: 'Connector Hub', icon: Plug, path: '/connectors' },
            { label: 'Settings', icon: Settings, path: '/settings' },
        ],
    },
];

export default function Sidebar() {
    const { data: uploads = [] } = useQuery({
        queryKey: ['uploads'],
        queryFn: () => getUploadJobs(),
        refetchInterval: 10000,
    });
    const pendingCount = uploads.filter(
        (u: any) => u.status === 'pending' || u.status === 'uploading'
    ).length;

    return (
        <aside className="w-64 border-r border-border bg-card flex flex-col h-full">
            <div className="p-6 border-b border-border">
                <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <MonitorPlay className="text-destructive" />
                    Content Factory
                </h1>
            </div>

            {/* Dashboard — always visible outside domain groups */}
            <div className="px-4 pt-4">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-3 px-4 py-3 rounded-md transition-colors',
                            isActive
                                ? 'bg-secondary text-primary font-medium'
                                : 'text-muted-foreground hover:bg-secondary/50 hover:text-primary'
                        )
                    }
                >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="font-medium">Dashboard</span>
                </NavLink>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
                {domainGroups.map((group) => (
                    <div key={group.domain}>
                        {/* Domain Section Header */}
                        <div className="flex items-center gap-1.5 px-2 mb-1.5">
                            <group.icon className="w-3 h-3 text-muted-foreground/60" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                {group.domain}
                            </span>
                        </div>

                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const Icon = item.icon;

                                if (item.disabled) {
                                    return (
                                        <div
                                            key={item.path}
                                            className="flex items-center gap-3 px-4 py-3 rounded-md text-muted-foreground/40 cursor-not-allowed select-none"
                                            title="Coming soon"
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="font-medium text-sm">{item.label}</span>
                                            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground/50 px-1.5 py-0.5 rounded">
                                                Soon
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex items-center gap-3 px-4 py-3 rounded-md transition-colors',
                                                isActive
                                                    ? 'bg-secondary text-primary font-medium'
                                                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-primary'
                                            )
                                        }
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium text-sm">{item.label}</span>
                                        {item.label === 'Uploads' && pendingCount > 0 && (
                                            <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
