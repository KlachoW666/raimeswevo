export default function PageContainer({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 overflow-y-auto w-full mx-auto relative px-4 pt-4 pb-6 no-scrollbar" style={{ maxWidth: '480px' }}>
            {children}
        </main>
    );
}
