import { PlaySquare } from 'lucide-react';

export default function PublishedVideos() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Published Videos</h1>
                <p className="text-muted-foreground mt-1 text-sm">Archive of successfully published Content Packages.</p>
            </div>

            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/10">
                <PlaySquare className="w-12 h-12 mb-4 text-muted-foreground/50" />
                <p>No published videos yet.</p>
            </div>
        </div>
    );
}
