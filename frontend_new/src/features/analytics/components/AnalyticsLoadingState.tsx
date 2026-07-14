import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsLoadingState(): JSX.Element {
  return (
    <div className="flex flex-col gap-4" data-testid="analytics-loading">
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-52" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="flex gap-4 overflow-x-auto pb-2">
          <Skeleton className="h-32 w-14 shrink-0" />
          <Skeleton className="h-32 w-14 shrink-0" />
          <Skeleton className="h-32 w-14 shrink-0" />
          <Skeleton className="h-32 w-14 shrink-0" />
          <Skeleton className="h-32 w-14 shrink-0" />
        </CardContent>
      </Card>
    </div>
  );
}
