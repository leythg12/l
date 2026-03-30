"use client";

import { useCart } from "@/components/CartContext";
import { ShoppingCart, Clock, Box, Layers } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/firestore";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.id === product.id);

  function handleAdd() {
    addItem({ id: product.id, name: product.name, price: product.price, image: product.previewImage });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  const hrs = Math.floor(product.printTimeMin / 60);
  const mins = product.printTimeMin % 60;
  const timeLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {product.previewImage ? (
          <Image
            src={product.previewImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 300px"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-5xl">🖨️</div>
        )}
        <span className="absolute top-2 left-2 bg-slate-800/80 text-white text-xs px-2 py-0.5 rounded-full capitalize font-medium">
          {product.material}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-2">{product.name}</h3>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
          {product.dimensions && (
            <span className="flex items-center gap-1"><Box size={11} />{product.dimensions}</span>
          )}
          {product.printTimeMin > 0 && (
            <span className="flex items-center gap-1"><Clock size={11} />~{timeLabel}</span>
          )}
          {product.color && (
            <span className="flex items-center gap-1"><Layers size={11} />{product.color}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-blue-600 font-bold text-base">
            {product.price.toFixed(2)} <span className="text-xs font-normal">SAR</span>
          </span>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              added ? "bg-green-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {added ? "Added!" : <><ShoppingCart size={12} />{inCart ? `+1 (${inCart.quantity})` : "Order"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
