import { Link } from "react-router-dom";
import { ExploreGridSkeleton } from "@food/components/ui/loading-skeletons";
import OptimizedImage from "@food/components/OptimizedImage";

export default function ExploreMoreSection({
  heading = "Explore More",
  items = [],
  showSkeleton = false,
}) {
  return (
    <section className="content-auto pt-2 sm:pt-3 lg:pt-4">
      <div className="px-4 mb-6 flex items-center gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
          {heading}
        </h2>
        <div className="h-[1px] bg-gray-100 dark:bg-gray-800 flex-1" />
      </div>
      <div className="px-4 pb-4 lg:pb-6">
        <div className="flex overflow-x-auto no-scrollbar gap-10 sm:gap-12 md:gap-16 items-start justify-center py-2">
          {showSkeleton
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`explore-skel-${index}`}
                  className="flex-shrink-0 w-20 sm:w-24 md:w-28"
                >
                  <ExploreGridSkeleton count={1} />
                </div>
              ))
            : items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-20 sm:w-24 md:w-28 transition-transform duration-300 hover:-translate-y-2 active:scale-95"
                  style={{
                    animation: `fade-in-up 0.4s ease-out ${index * 0.08}s backwards`,
                  }}
                >
                  <Link to={item.href} className="block w-full">
                    <div className="flex flex-col items-center gap-2 w-full group">
                      <div className="relative w-full aspect-square rounded-[1.25rem] bg-white dark:bg-[#1a1a1a] flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] group-hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.15)] transition-all duration-500 overflow-hidden border border-gray-100 dark:border-gray-800 group-hover:border-primary/40">
                        <div
                          className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${
                            index % 3 === 0
                              ? "from-primary to-rose-500"
                              : index % 3 === 1
                                ? "from-indigo-500 to-purple-500"
                                : "from-teal-500 to-emerald-500"
                          } z-20 pointer-events-none`}
                        />
                        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-25deg] w-[150%] animate-explore-shine"
                            style={{ animationDelay: `${5 + index * 0.5}s` }}
                          />
                        </div>
                        <OptimizedImage
                          src={item.image}
                          alt={item.label}
                          className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110"
                          width={200}
                          height={200}
                        />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-white transition-colors text-center tracking-tight leading-tight uppercase px-1">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
