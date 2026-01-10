import axios from 'axios';
import Parser from 'rss-parser';
import { NewsArticle } from './types';
import crypto from 'crypto';

const rssParser = new Parser();

export function generateContentHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

// Fetch news from NewsAPI
export async function fetchNewsAPI(competitorName: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn('NEWS_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: competitorName,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 20,
        apiKey: apiKey,
      },
    });

    return response.data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || '',
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
      content: article.content,
    }));
  } catch (error) {
    console.error(`Error fetching news for ${competitorName}:`, error);
    return [];
  }
}

// Fetch from RSS feeds
export async function fetchRSSFeeds(feedUrls: string[]): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  for (const feedUrl of feedUrls) {
    try {
      const feed = await rssParser.parseURL(feedUrl);

      feed.items.forEach((item) => {
        if (item.title && item.link) {
          articles.push({
            title: item.title,
            description: item.contentSnippet || item.content || '',
            url: item.link,
            source: feed.title || 'RSS Feed',
            publishedAt: item.pubDate || new Date().toISOString(),
            content: item.content,
          });
        }
      });
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    }
  }

  return articles;
}

// Fetch company blog (generic web scraping would go here)
export async function fetchCompanyBlog(websiteUrl: string): Promise<NewsArticle[]> {
  // For MVP, this would require specific scraping logic per company
  // We'll implement this as a placeholder that can be extended
  return [];
}

// Main function to gather all news for a competitor
export async function gatherCompetitorNews(
  competitorName: string,
  websiteUrl?: string,
  rssFeeds?: string[]
): Promise<NewsArticle[]> {
  const allArticles: NewsArticle[] = [];

  // Fetch from NewsAPI
  const newsApiArticles = await fetchNewsAPI(competitorName);
  allArticles.push(...newsApiArticles);

  // Fetch from RSS feeds if provided
  if (rssFeeds && rssFeeds.length > 0) {
    const rssArticles = await fetchRSSFeeds(rssFeeds);
    allArticles.push(...rssArticles);
  }

  // Fetch from company blog if website provided
  if (websiteUrl) {
    const blogArticles = await fetchCompanyBlog(websiteUrl);
    allArticles.push(...blogArticles);
  }

  // Remove duplicates based on URL
  const uniqueArticles = allArticles.filter(
    (article, index, self) =>
      index === self.findIndex((a) => a.url === article.url)
  );

  return uniqueArticles;
}
