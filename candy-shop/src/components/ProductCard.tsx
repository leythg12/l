"use client";

import { useCart } from "@/components/CartContext";
import { ShoppingCart, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string;
  stock: number;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.id === product.id);

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-44 bg-pink-50 overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 300px"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">🍬</div>
        )}
        <span className="absolute top-2 left-2 bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full capitalize font-medium">
          {product.category}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-pink-600 font-bold text-base">
            {product.price.toFixed(2)} <span className="text-xs font-normal">SAR</span>
          </span>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              added
                ? "bg-green-500 text-white"
                : "bg-pink-600 hover:bg-pink-700 text-white"
            }`}
          >
            {added ? (
              "Added!"
            ) : (
              <>
                {inCart ? <Plus size={12} /> : <ShoppingCart size={12} />}
                {inCart ? `+1 (${inCart.quantity})` : "Add to Cart"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
