import { Article } from '../types/news'

export const shareArticle = async (article: Article): Promise<void> => {
  if (navigator.share) {
    await navigator.share({ title: article.title, url: article.url })
  } else {
    await navigator.clipboard.writeText(article.url)
  }
}
