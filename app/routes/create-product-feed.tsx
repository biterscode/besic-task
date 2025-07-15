import { useFetcher } from "@remix-run/react";

export default function CreateProductFeed() {
  const fetcher:any = useFetcher();

  return (
    <div className="p-4 max-w-md">
      <fetcher.Form method="post" action="/api/product-feed-create" className="space-y-4">
        <h1 className="text-2xl font-bold mb-4">Create Product Feed</h1>

        <div>
          <label htmlFor="country" className="block font-medium">Country (e.g. IN, US)</label>
          <input
            name="country"
            id="country"
            required
            className="mt-1 w-full border rounded p-2"
            placeholder="IN"
          />
        </div>

        <div>
          <label htmlFor="language" className="block font-medium">Language (e.g. EN, FR)</label>
          <input
            name="language"
            id="language"
            required
            className="mt-1 w-full border rounded p-2"
            placeholder="EN"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create Product Feed
        </button>
      </fetcher.Form>

      {fetcher.data?.feedId && (
        <p className="mt-4 text-green-700">✅ Feed ID: {fetcher.data.feedId}</p>
      )}

      {fetcher.data?.errors && (
        <div className="mt-4 text-red-600">
          {fetcher.data.errors.map((err: any, i: number) => (
            <p key={i}>❌ {err.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
