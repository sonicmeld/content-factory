import { Activity } from 'lucide-react';

export default function Header() {
    return (
        <header className="h-16 border-b border-border bg-card flex items-center px-6 justify-between shrink-0">
            <h2 className="text-lg font-semibold">Workspace</h2>
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
                    <Activity className="w-4 h-4 text-green-500" />
                    System Online
                </span>
            </div>
        </header>
    );
}
