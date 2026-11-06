import { Children } from "react";

export default function CubeWrapper({
  titles = [],
  children,
}: {
  titles?: React.ReactNode[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row flex-wrap gap-8 pb-6 pt-2">
      {Children.toArray(children).map((cube, index) => (
        <div key={index} className="flex flex-col gap-1">
          {titles[index] && <span className="text-sm font-bold">{titles[index]}</span>}
          <div className="w-80 h-80 border border-neutral-400 rounded-sm overflow-hidden">
            {cube}
          </div>
        </div>
      ))}
    </div>
  );
}
