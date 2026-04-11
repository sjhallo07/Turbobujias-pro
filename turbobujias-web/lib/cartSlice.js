import { createSelector, createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const existingItem = state.items.find((item) => item.sku === action.payload.sku);

      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.lineTotal = Number(
          (existingItem.quantity * existingItem.price_usd).toFixed(2)
        );
        return;
      }

      state.items.push({
        ...action.payload,
        quantity: 1,
        lineTotal: Number(action.payload.price_usd.toFixed(2)),
      });
    },
    incrementQuantity(state, action) {
      const item = state.items.find((entry) => entry.sku === action.payload);
      if (!item) {
        return;
      }

      item.quantity += 1;
      item.lineTotal = Number((item.quantity * item.price_usd).toFixed(2));
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

      item.lineTotal = Number((item.quantity * item.price_usd).toFixed(2));
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

const selectCartState = (state) => state.cart;

export const selectCartItems = createSelector([selectCartState], (cart) => cart.items);

export const selectCartCount = createSelector([selectCartItems], (items) =>
  items.reduce((total, item) => total + item.quantity, 0)
);

export const selectCartTotals = createSelector([selectCartItems], (items) => ({
  subtotal: Number(items.reduce((total, item) => total + item.lineTotal, 0).toFixed(2)),
}));

export default cartSlice.reducer;
