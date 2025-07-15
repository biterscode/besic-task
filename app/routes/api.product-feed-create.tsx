import { json, type ActionFunctionArgs } from "@remix-run/node";
import { PRODUCT_FEED_CREATE_MUTATION } from "app/graphql/productFeedCreate.mutation";

const SHOP = process.env.SHOP!;
const TOKEN = process.env.ADMIN_API_TOKEN!;

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const country = formData.get("country")?.toString().trim().toUpperCase();
    const language = formData.get("language")?.toString().trim().toUpperCase();

    if (!country || !language) {
      return json(
        { errors: [{ message: "Country and language are required." }] },
        { status: 400 }
      );
    }

    const body = JSON.stringify({
      query: PRODUCT_FEED_CREATE_MUTATION,
      variables: {
        input: {
          country,
          language,
        },
      },
    });

    const response = await fetch(
      `https://${SHOP}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": TOKEN,
        },
        body,
      }
    );

    const result = await response.json();
    console.log("GraphQL Response:", JSON.stringify(result, null, 2));

    if (result.errors?.length) {
      return json({ errors: result.errors }, { status: 500 });
    }

    const userErrors = result?.data?.productFeedCreate?.userErrors;
    if (userErrors?.length) {
      return json({ errors: userErrors }, { status: 400 });
    }

    const feedId = result?.data?.productFeedCreate?.productFeed?.id;
    if (!feedId) {
      return json({ errors: [{ message: "Feed ID not returned by Shopify." }] }, { status: 500 });
    }

    return json({ feedId });

  } catch (error: any) {
    console.error("Server Error:", error);
    return json(
      { errors: [{ message: error.message || "Unexpected error occurred." }] },
      { status: 500 }
    );
  }
};
