import { NavLink, useParams } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    UploadCloud,
    PlaySquare,
    ImageIcon,
    Sparkles,
    Settings,
    ArrowLeft,
    CheckCircle2,
    Plug,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getChannels, getPackages } from '../services/api';

type SidebarNavItem = {
    label: string;
    icon: React.ElementType;
    path: string;
    isPrimary?: boolean;
};

type SidebarSection = {
    section: string;
    items: SidebarNavItem[];
};

export default function WorkspaceSidebar() {
    const { slug } = useParams();
    const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: getChannels });

    const currentChannel = channels.find((c: any) => c.slug === slug);
    const { data: packages = [] } = useQuery({
        queryKey: ['packages', currentChannel?.id],
        queryFn: () => getPackages(currentChannel?.id),
        enabled: !!currentChannel?.id,
    });

    const sections: SidebarSection[] = [
        {
            section: 'Production Pipeline',
            items: [
                { label: 'Overview', icon: LayoutDashboard, path: `/workspace/${slug}` },
                { label: 'Content Packages', icon: Package, path: `/workspace/${slug}/packages`, isPrimary: true },
                { label: 'Upload Queue', icon: UploadCloud, path: `/workspace/${slug}/queue` },
                { label: 'Published Videos', icon: PlaySquare, path: `/workspace/${slug}/published` },
            ],
        },
        {
            section: 'Prompt',
            items: [
                { label: 'Prompt Contexts', icon: Sparkles, path: `/workspace/${slug}/prompts` },
            ],
        },
        {
            section: 'Production Assets',
            items: [
                { label: 'Assets', icon: ImageIcon, path: `/workspace/${slug}/assets` },
            ],
        },
        {
            section: 'Connectors',
            items: [
                { label: 'Connector Hub', icon: Plug, path: `/workspace/${slug}/production` },
            ],
        },
        {
            section: 'Administration',
            items: [
                { label: 'Channel Settings', icon: Settings, path: `/workspace/${slug}/settings` },
            ],
        },
    ];

    return (
        <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-border space-y-4">
                <NavLink
                    to="/channels"
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Channels
                </NavLink>

                <div>
                    <h2
                        className="text-xl font-bold truncate"
                        title={currentChannel?.name || 'Loading...'}
                    >
                        {currentChannel?.name || 'Loading...'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md truncate">
                            /{slug}
                        </span>
                        {currentChannel?.oauth_status === 'OAuth Connected' && (
                            <span className="flex items-center text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Connected
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-5">
                {sections.map((section) => (
                    <div key={section.section}>
                        {/* Section Header */}
                        <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5 px-2">
                            {section.section}
                        </h3>

                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === `/workspace/${slug}`}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                                                isActive
                                                    ? item.isPrimary
                                                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                                        : 'bg-secondary text-primary font-medium'
                                                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                            )
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div className="flex items-center gap-3 flex-1">
                                                    <Icon className="w-4 h-4" />
                                                    <span className="text-sm">{item.label}</span>
                                                </div>
                                                {item.label === 'Content Packages' && packages.length > 0 && (
                                                    <span
                                                        className={cn(
                                                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                                            isActive
                                                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                                                : 'bg-primary/10 text-primary'
                                                        )}
                                                    >
                                                        {packages.length}
                                                    </span>
                                                )}
                                            </>
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
