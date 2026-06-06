import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

export default function CreatePackage() {
    const { slug } = useParams();

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-4">
                <Link to={`/workspace/${slug}/packages`} className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Assemble Content Package</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Combine assets to build a publishable unit.</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/10">
                    <p>Asset Consumption View Placeholder</p>
                    <p className="text-sm mt-2 max-w-md text-center">Here you will select Shared and Channel assets side-by-side to build the Content Package.</p>
                </div>

                <div className="mt-6 flex justify-end">
                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors opacity-50 cursor-not-allowed">
                        <Save className="w-4 h-4" />
                        Save Package
                    </button>
                </div>
            </div>
        </div>
    );
}
