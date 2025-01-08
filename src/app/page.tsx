"use client";

import { scrapeInstagram } from "@/actions";
import { type JSX, useState } from "react";

interface ScrapeResponse {
  followersCount: number;
  followingCount: number;
  notFollowBack: string[];
  notFollowingBack: string[];
}

export default function HomePage(): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<ScrapeResponse | null>(null);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Instagram Follows Checker</h1>

      <form
        action={async (formData: FormData) => {
          try {
            setLoading(true);
            setError("");
            setResult(null);

            const data = await scrapeInstagram(formData);
            setResult(data);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Something went wrong",
            );
          } finally {
            setLoading(false);
          }
        }}
        className="space-y-4 mb-8"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Username:</label>
          <input
            name="username"
            type="text"
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password:</label>
          <input
            name="password"
            type="password"
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? "Scraping..." : "Check Follows"}
        </button>
      </form>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-semibold">Results</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded">
              <p className="font-medium">Followers: {result.followersCount}</p>
            </div>
            <div className="p-4 bg-gray-100 rounded">
              <p className="font-medium">Following: {result.followingCount}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">
              They follow me, but I don&apos;t follow them:
            </h3>
            {result.notFollowBack.length === 0 ? (
              <p className="text-gray-600">None</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {result.notFollowBack.map((user) => (
                  <li key={user}>{user}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-xl font-medium mb-2">
              I follow them, but they don&apos;t follow me back:
            </h3>
            {result.notFollowingBack.length === 0 ? (
              <p className="text-gray-600">None</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {result.notFollowingBack.map((user) => (
                  <li key={user}>{user}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
