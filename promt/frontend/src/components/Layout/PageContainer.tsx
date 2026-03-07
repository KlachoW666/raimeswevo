export default function PageContainer({ children }: { children: React.ReactNode }) {
    return (
        <main
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full mx-auto relative px-4 pt-4 pb-6 no-scrollbar scroll-smooth"
            style={{
                maxWidth: '480px',
                paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
                WebkitOverflowScrolling: 'touch',
            }}
        >
            <div className="relative z-10 min-h-full aurora-bg">
                {children}
            </div>
        </main>
    );
}
