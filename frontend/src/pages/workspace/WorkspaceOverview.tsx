import { Package, AlertCircle, Clock, Activity } from 'lucide-react';
import { useParams } from 'react-router-dom';

export default function WorkspaceOverview() {
    const { slug } = useParams();

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Workspace Overview</h1>
                <p className="text-muted-foreground mt-1 text-sm">Monitor content pipeline and publishing status for this channel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Pipeline Health</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Ready Packages</span>
                            <span className="font-bold text-lg">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Pending Packages</span>
                            <span className="font-bold text-lg">0</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Scheduled Packages</span>
                            <span className="font-bold text-lg">0</span>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="w-5 h-5 text-destructive" /> Action Required</h3>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col items-center justify-center h-24 text-center">
                        No immediate actions required.
                        Pipeline is healthy.
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Upcoming Queue</h3>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col items-center justify-center h-24 text-center">
                        No packages scheduled for the upcoming days.
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-500" /> Recent Activity</h3>
                </div>
                <div className="text-sm text-muted-foreground flex flex-col items-center justify-center h-32 text-center border-2 border-dashed border-border rounded-lg bg-secondary/20">
                    Activity log will appear here.
                </div>
            </div>
        </div>
    );
}
