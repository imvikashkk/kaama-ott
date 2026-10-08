import AuthPage from "@/components/Auth"

// Dynamic → served with Cache-Control: no-store, so Back from home re-requests this
// page and the proxy redirects logged-in users instead of showing a cached login screen
export const dynamic = 'force-dynamic';

export default function page() {
    return (
        <div>
            <AuthPage />
        </div>
    )
}


