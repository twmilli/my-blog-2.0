import { error } from '@sveltejs/kit';
import { getPostBySlug } from '../../../lib/server/posts.js';

export function load({ params }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    throw error(404, 'Not found');
  }

  return { post };
}
