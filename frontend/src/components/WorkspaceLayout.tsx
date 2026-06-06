import React from 'react';
import WorkspaceSidebar from './WorkspaceSidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';

export default function WorkspaceLayout() {
    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <WorkspaceSidebar />
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto p-6 bg-muted/20">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
