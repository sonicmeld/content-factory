import { Settings } from 'lucide-react';

export default function ChannelSettings() {
    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Channel Settings</h1>
                <p className="text-muted-foreground mt-1 text-sm">Configure metadata profiles, defaults, and API connections.</p>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/10">
                    <Settings className="w-10 h-10 mb-4 text-muted-foreground/50" />
                    <p>Channel Settings Placeholder</p>
                    <p className="text-sm mt-1">OAuth and metadata configuration will go here.</p>
                </div>
            </div>
        </div>
    );
}
