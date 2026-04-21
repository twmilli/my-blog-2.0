import fs from "node:fs";
import path from "node:path";
import prism from "prismjs";
import marked from "marked";
import matter from "gray-matter";
import formatDate from "date-fns/format";
import readingTime from "reading-time";
import "prismjs/components/prism-jsx.min.js";

const cwd = process.cwd();
const POSTS_DIR = path.join(cwd, "src/routes/blog/posts/");
const STATIC_DIR = path.join(cwd, "static");
const EXCERPT_SEPARATOR = "<!-- more -->";
const renderer = new marked.Renderer();
const linkRenderer = renderer.link;
const imageRenderer = renderer.image;
const ABSOLUTE_PROTOCOL = /^[a-z][a-z\d+.-]*:/i;
const DOMAIN_LIKE = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#].*)?$/i;

function unwrapUrl(rawUrl = "") {
  let url = rawUrl.trim();
  let previous = "";

  while (url !== previous) {
    previous = url;
    url = url
      .replace(/^<+/, "")
      .replace(/>+$/, "")
      .replace(/^\(+/, "")
      .replace(/\)+$/, "");
  }

  return url;
}

function normalizeLinkUrl(rawUrl = "") {
  const url = unwrapUrl(rawUrl);

  if (
    !url ||
    url.indexOf("/") === 0 ||
    url.indexOf("./") === 0 ||
    url.indexOf("../") === 0 ||
    url.indexOf("#") === 0
  ) {
    return url;
  }

  if (url.indexOf("//") === 0) {
    return `https:${url}`;
  }

  if (ABSOLUTE_PROTOCOL.test(url)) {
    return url;
  }

  if (DOMAIN_LIKE.test(url)) {
    return `https://${url}`;
  }

  return url;
}

function resolveImageUrl(rawUrl = "") {
  const url = unwrapUrl(rawUrl);

  if (!url) {
    return null;
  }

  if (url.indexOf("/") === 0 || url.indexOf("//") === 0 || ABSOLUTE_PROTOCOL.test(url)) {
    return url;
  }

  const normalized = url.replace(/^\.\//, "");
  const staticPath = path.join(STATIC_DIR, normalized);

  if (fs.existsSync(staticPath)) {
    return `/${normalized}`;
  }

  return null;
}

renderer.link = (href, title, text) => {
  const url = normalizeLinkUrl(href || "");
  const html = linkRenderer.call(renderer, url, title, text);

  if (url.indexOf("/") === 0) {
    // Do not open internal links on new tab
    return html;
  } else if (url.indexOf("#") === 0) {
    // Handle hash links to internal elements
    const html = linkRenderer.call(renderer, "javascript:;", title, text);
    return html.replace(
      /^<a /,
      `<a onclick="document.location.hash='${url.substr(1)}';" `
    );
  }

  return html.replace(/^<a /, '<a target="_blank" rel="nofollow" ');
};

renderer.image = (href, title, text) => {
  const url = resolveImageUrl(href || "");

  if (!url) {
    return "";
  }

  return imageRenderer.call(renderer, url, title, text);
};

renderer.code = (code, language) => {
  const parser = prism.languages[language] || prism.languages.html;
  const highlighted = prism.highlight(code, parser, language);
  return `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({ renderer });

const posts = fs
  .readdirSync(POSTS_DIR)
  .filter((fileName) => /\.md$/.test(fileName))
  .map((fileName) => {
    const fileMd = fs.readFileSync(path.join(POSTS_DIR, fileName), "utf8");
    const { data, content: rawContent } = matter(fileMd);
    const { title, date, slug, tag } = data;
    let content = rawContent;
    let excerpt = "";

    if (rawContent.indexOf(EXCERPT_SEPARATOR) !== -1) {
      const splittedContent = rawContent.split(EXCERPT_SEPARATOR);
      excerpt = splittedContent[0];
      content = splittedContent[1];
    }

    const html = marked(content);
    const readingStats = readingTime(content);
    const printReadingTime = readingStats.text;
    const printDate = formatDate(new Date(date), "MMMM D, YYYY");

    return {
      title,
      tag,
      slug,
      html,
      date,
      excerpt,
      printDate,
      printReadingTime,
    };
  });

posts.sort((a, b) => {
  const dateA = new Date(a.date);
  const dateB = new Date(b.date);

  if (dateA > dateB) return -1;
  if (dateA < dateB) return 1;
  return 0;
});

posts.forEach((post) => {
  post.html = post.html.replace(/^\t{3}/gm, "");
});

export default posts;
