import { getPostSummaries } from '../../lib/server/posts.js';

export function load() {
  return {
    posts: getPostSummaries()
  };
}
