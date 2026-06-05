import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MonitorPlay, Image, UploadCloud, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Channels', icon: MonitorPlay, path: '/channels' },
    { label: 'Assets', icon: Image, path: '/assets' },
    { label: 'Uploads', icon: UploadCloud, path: '/uploads' },
    { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
    return (
        <aside className="w-64 border-r border-border bg-card flex flex-col h-full">
            <div className="p-6 border-b border-border">
                <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <MonitorPlay className="text-destructive" /> 
                    Content Factory
                </h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                            isActive ? "bg-secondary text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-primary"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
