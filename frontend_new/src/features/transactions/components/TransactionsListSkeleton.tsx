import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsListSkeleton(): JSX.Element {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card className="py-0" key={index}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden md:block">
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_0.8fr] gap-2 border-b px-3 py-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton className="h-4 w-24" key={index} />
            ))}
          </div>

          <div className="flex flex-col gap-0">
            {Array.from({ length: 7 }).map((_, index) => (
              <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_0.8fr] gap-2 border-b px-3 py-3" key={index}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
