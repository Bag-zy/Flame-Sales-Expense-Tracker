'use client';

export default function OfflinePage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">You are offline</h1>
      <p className="text-muted-foreground">
        Some data, such as the latest expenses, sales, and reports, requires an internet connection.
        You can still open pages that were visited before going offline, or try reconnecting to
        continue using Flame Sales & Expense Tracker normally.
      </p>
    </div>
  );
}
