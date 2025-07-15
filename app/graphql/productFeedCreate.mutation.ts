export const PRODUCT_FEED_CREATE_MUTATION = `
  mutation ProductFeedCreate($input: ProductFeedInput!) {
    productFeedCreate(input: $input) {
      productFeed {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
