export default function PageContainer({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 min-h-0 overflow-y-auto w-full mx-auto relative px-4 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))] no-scrollbar scroll-smooth" style={{ maxWidth: '480px' }}>
            <div className="relative z-10 min-h-full aurora-bg">
                {children}
            </div>
        </main>
    );
}
