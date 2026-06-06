import { UploadCloud } from 'lucide-react';

export default function UploadQueue() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Upload Queue</h1>
                <p className="text-muted-foreground mt-1 text-sm">Manage scheduled publishing jobs for this channel.</p>
            </div>

            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/10">
                <UploadCloud className="w-12 h-12 mb-4 text-muted-foreground/50" />
                <p>No active upload jobs.</p>
                <p className="text-sm mt-1">Schedule a Content Package to see it here.</p>
            </div>
        </div>
    );
}
