import React, { useEffect, useState } from 'react';

export default function NewsFeed() {
  const colors = {
    darkGrey: '#0e0e0e',
    cardBg: '#1c1c1e',
    highlight: '#4da6ff',
    textPrimary: '#f1f1f1',
    textSecondary: '#9a9a9a',
  };

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiKey = '455e35ae1dd949ab9e8175641c03ca93';
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=9&apiKey=${apiKey}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then((data) => {
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        backgroundColor: colors.darkGrey,
        minHeight: '100vh',
        padding: '2rem 1rem',
        fontFamily: 'system-ui, sans-serif',
        color: colors.textPrimary,
        maxWidth: 1080,
        margin: 'auto',
      }}
    >
      <h1 style={{ marginBottom: '2rem', fontSize: '2.2rem', fontWeight: '700' }}>
        Top News & Highlights
      </h1>

      {loading && <p style={{ color: colors.textSecondary }}>Loading news articles...</p>}
      {error && <p style={{ color: 'tomato' }}>Error loading news: {error}</p>}

      <div
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        {!loading &&
          !error &&
          articles.map((article, index) => (
            <a
              key={index}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: colors.cardBg,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                cursor: 'pointer',
                textDecoration: 'none',
                color: colors.textPrimary,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
              }}
            >
              <img
                src={article.urlToImage || '/images/default-thumbnail.jpg'}
                alt={article.title}
                style={{ width: '100%', height: 180, objectFit: 'cover' }}
              />
              <div style={{ padding: '1rem', flex: 1 }}>
                <h3
                  style={{
                    margin: '0 0 0.5rem',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    color: colors.highlight,
                    lineHeight: 1.4,
                  }}
                >
                  {article.title}
                </h3>
                <p style={{ color: colors.textSecondary, fontSize: '0.95rem', marginBottom: '1rem' }}>
                  {article.description || 'No summary available.'}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    color: colors.textSecondary,
                    fontWeight: '500',
                  }}
                >
                  <span>{article.source.name}</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </a>
          ))}
      </div>
    </div>
  );
}
