"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartSnapshot } from "@/components/cart/useCart";

export function AddToBasketButton({
  product,
  disabled = false,
}: {
  product: CartSnapshot;
  disabled?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
      <div className="stepper">
        <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
          −
        </button>
        <input
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
        />
        <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">
          +
        </button>
      </div>
      <button
        className="btn btn-primary btn-lg"
        disabled={disabled}
        style={{ flex: 1 }}
        onClick={() => {
          add(product, qty);
          toast.success(`Added ${qty} × ${product.name} to basket`);
          setOpen(true);
        }}
      >
        <ShoppingCart size={18} strokeWidth={2} /> Add to basket
      </button>
    </div>
  );
}
