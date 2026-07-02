// Shown by Next.js while a dashboard route segment's chunk/RSC payload is
// loading during client-side navigation between routes.
export default function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  );
}
