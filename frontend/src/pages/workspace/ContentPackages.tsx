import { PackagePlus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export default function ContentPackages() {
    const { slug } = useParams();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Content Packages</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage the primary content units for this channel.</p>
                </div>
                <Link 
                    to={`/workspace/${slug}/packages/create`}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                    <PackagePlus className="w-4 h-4" />
                    Create Package
                </Link>
            </div>

            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/10">
                <PackagePlus className="w-12 h-12 mb-4 text-muted-foreground/50" />
                <p>No content packages found.</p>
                <p className="text-sm mt-1">Create a new package to start publishing.</p>
            </div>
        </div>
    );
}
