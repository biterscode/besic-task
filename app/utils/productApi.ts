// app/utils/productApi.ts
export const fetchProductsFromApi = async (params?: string | undefined) => {
  try {
    const response = await fetch(`/api/products?${params}`
    );
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error fetching products from API:', error);
    return { products: [], pageInfo: {}, totalCount: 0, details: error.message };
  }
};