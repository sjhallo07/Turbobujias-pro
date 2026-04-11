import { createSelector, createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
};
const MAX_CART_QUANTITY = 999;

function getSafePrice(item) {
  const price = Number(item?.price_usd);
  return Number.isFinite(price) ? price : 0;
}

function getSafeQuantity(item) {
  const quantity = Number(item?.quantity);
  return Number.isFinite(quantity) && Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
}

function clampQuantity(quantity) {
  return Math.min(quantity, MAX_CART_QUANTITY);
}

function calculateLineTotal(quantity, price) {
  return Number((quantity * price).toFixed(2));
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const quantityToAdd = getSafeQuantity(action.payload);
      const unitPrice = getSafePrice(action.payload);
      const existingItem = state.items.find((item) => item.sku === action.payload.sku);

      if (existingItem) {
        existingItem.quantity = clampQuantity(existingItem.quantity + quantityToAdd);
        existingItem.lineTotal = calculateLineTotal(existingItem.quantity, getSafePrice(existingItem));
        return;
      }

      state.items.push({
        ...action.payload,
        price_usd: unitPrice,
        quantity: clampQuantity(quantityToAdd),
        lineTotal: calculateLineTotal(clampQuantity(quantityToAdd), unitPrice),
      });
    },
    incrementQuantity(state, action) {
      const item = state.items.find((entry) => entry.sku === action.payload);
      if (!item) {
        return;
      }

      item.quantity = clampQuantity(item.quantity + 1);
      item.lineTotal = calculateLineTotal(item.quantity, getSafePrice(item));
    },
    decrementQuantity(state, action) {
      const item = state.items.find((entry) => entry.sku === action.payload);
      if (!item) {
        return;
      }

      item.quantity -= 1;
      if (item.quantity <= 0) {
        state.items = state.items.filter((entry) => entry.sku !== action.payload);
        return;
      }

      item.lineTotal = calculateLineTotal(item.quantity, getSafePrice(item));
    },
    removeFromCart(state, action) {
      state.items = state.items.filter((item) => item.sku !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const {
  addToCart,
  incrementQuantity,
  decrementQuantity,
  removeFromCart,
  clearCart,
} = cartSlice.actions;

export const selectCartState = (state) => state.cart;

export const selectCartItems = createSelector([selectCartState], (cart) => cart.items);

export const selectCartCount = createSelector([selectCartItems], (items) =>
  items.reduce((total, item) => total + item.quantity, 0)
);

export const selectCartTotals = createSelector([selectCartItems], (items) => ({
  subtotal: Number(items.reduce((total, item) => total + item.lineTotal, 0).toFixed(2)),
}));

export default cartSlice.reducer;
