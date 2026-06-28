import { useMemo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ShopPlaceholder } from "@food/components/OptimizedImage";
import { useGridColumns } from "@food/hooks/user/useGridColumns";
import HomeRestaurantCard from "@food/components/user/home/HomeRestaurantCard";

function RestaurantGridSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`skel-card-${index}`} className="h-full">
          <div className="overflow-hidden gap-0 border-0 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] rounded-[28px] flex flex-col h-full w-full relative shadow-sm border border-orange-50 dark:border-orange-900/10 shadow-[0_4px_20px_rgba(249,115,22,0.04)]">
            <div className="relative h-48 sm:h-56 md:h-60 lg:h-64 xl:h-72 bg-[#f7f5f2] dark:bg-zinc-800 animate-pulse flex flex-col items-center justify-center">
              <ShopPlaceholder />
            </div>
            <div className="p-3 sm:p-4 lg:p-5 pt-3 sm:pt-4 lg:pt-5 flex flex-col flex-grow">
              <div className="flex items-start justify-between gap-2 mb-2 lg:mb-3">
                <div className="h-6 lg:h-8 w-48 lg:w-64 bg-orange-100 dark:bg-orange-900/30 rounded-md animate-pulse" />
                <div className="h-6 lg:h-8 w-16 bg-orange-200 dark:bg-orange-800/40 rounded-3xl animate-pulse" />
              </div>
              <div className="h-4 lg:h-5 w-24 bg-orange-50 dark:bg-orange-900/20 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default function RestaurantGrid({
  restaurants = [],
  backendOrigin = "",
  isOutOfService = false,
  showSkeleton = false,
  isLoading = false,
  isFavorite,
  onToggleFavorite,
}) {
  const columns = useGridColumns();

  const rows = useMemo(() => {
    const grouped = [];
    for (let index = 0; index < restaurants.length; index += columns) {
      grouped.push(restaurants.slice(index, index + columns));
    }
    return grouped;
  }, [restaurants, columns]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => (columns === 1 ? 430 : columns === 2 ? 400 : 390),
    overscan: 2,
  });

  if (showSkeleton && restaurants.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-4 lg:gap-5 xl:gap-6 px-4 pt-1 sm:pt-1.5 lg:pt-2 items-stretch">
        <RestaurantGridSkeleton />
      </div>
    );
  }

  if (restaurants.length === 0) {
    return null;
  }

  return (
    <div
      className={`px-4 pt-1 sm:pt-1.5 lg:pt-2 ${
        isLoading ? "opacity-50" : "opacity-100"
      } transition-opacity duration-300`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index] || [];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-4 lg:gap-5 xl:gap-6 items-stretch pb-5 sm:pb-4 lg:pb-5 xl:pb-6">
                {row.map((restaurant, columnIndex) => {
                  const cardIndex = virtualRow.index * columns + columnIndex;
                  return (
                    <HomeRestaurantCard
                      key={
                        restaurant?.id ||
                        restaurant?._id ||
                        restaurant?.mongoId ||
                        cardIndex
                      }
                      restaurant={restaurant}
                      index={cardIndex}
                      backendOrigin={backendOrigin}
                      isOutOfService={isOutOfService}
                      isFavorite={isFavorite}
                      onToggleFavorite={onToggleFavorite}
                      animateEntrance={cardIndex < 10}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
