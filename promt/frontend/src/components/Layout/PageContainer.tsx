export default function PageContainer({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto relative pt-4 pb-12 px-4 scroll-smooth">
            {children}
        </main>
    );
}
