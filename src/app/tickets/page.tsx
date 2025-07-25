import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TicketsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Tickets</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            No tickets yet. We will sync from GitHub later.
          </p>
          <Button className="w-full">Open issue manually</Button>
        </CardContent>
      </Card>
    </div>
  );
}
