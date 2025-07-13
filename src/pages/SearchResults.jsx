// src/pages/SearchResults.jsx
import { useSearchParams } from "react-router-dom";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");

  return (
    <div>
      <h2>Search Results for: {query}</h2>
      {/* Add your search results rendering here */}
    </div>
  );
}