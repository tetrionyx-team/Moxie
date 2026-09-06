import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static/admin/react',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'src/entries/dashboard.jsx'),
        productList: resolve(__dirname, 'src/entries/productList.jsx'),
        categoryList: resolve(__dirname, 'src/entries/categoryList.jsx'),
        bannerList: resolve(__dirname, 'src/entries/bannerList.jsx'),
        reviewList: resolve(__dirname, 'src/entries/reviewList.jsx'),
        addProduct: resolve(__dirname, 'src/entries/addProduct.jsx'),
        messages: resolve(__dirname, 'src/entries/messages.jsx'),
        adminUsers: resolve(__dirname, 'src/entries/adminUsers.jsx'),
        customers: resolve(__dirname, 'src/entries/customers.jsx'),
        orders: resolve(__dirname, 'src/entries/orders.jsx'),
        settings: resolve(__dirname, 'src/entries/settings.jsx'),
        login: resolve(__dirname, 'src/entries/login.jsx'),
        offers: resolve(__dirname, 'src/entries/offers.jsx'),
        profile: resolve(__dirname, 'src/entries/profile.jsx'),







      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
})
