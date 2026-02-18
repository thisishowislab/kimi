import fs from "node:fs";
import path from "node:path";

const SITE_ORIGIN = "https://kimi-red.vercel.app"; // change if you use custom domain
const POSTS_JSON = path.join(process.cwd(), "data", "posts.json");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function richTextToHtml(node) {
  if (!node || typeof node !== "object") return "";

  const children = (node.content || []).map(richTextToHtml).join("");

  switch (node.nodeType) {
    case "document":
      return children;

    case "paragraph":
      return children.trim() ? `<p>${children}</p>` : "";

    case "heading-1":
      return `<h1>${children}</h1>`;
    case "heading-2":
      return `<h2>${children}</h2>`;
    case "heading-3":
      return `<h3>${children}</h3>`;

    case "unordered-list":
      return `<ul>${children}</ul>`;
    case "ordered-list":
      return `<ol>${children}</ol>`;
    case "list-item":
      return `<li>${children}</li>`;

    case "blockquote":
      return `<blockquote>${children}</blockquote>`;

    case "hyperlink": {
      const href = node.data?.uri ? escapeHtml(node.data.uri) : "#";
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${children}</a>`;
    }

    case "text": {
      let text = escapeHtml(node.value || "");
      const marks = node.marks || [];
      for (const m of marks) {
        if (m.type === "bold") text = `<strong>${text}</strong>`;
        if (m.type === "italic") text = `<em>${text}</em>`;
        if (m.type === "underline") text = `<u>${text}</u>`;
        if (m.type === "code") text = `<code>${text}</code>`;
      }
      return text;
    }

    default:
      // ignore embedded assets/entries or unknown nodes for now
      return children;
  }
}

function basicParagraphs(text = "") {
  // If your posts.json already includes HTML (recommended), use that instead.
  const safe = escapeHtml(text);
  const paragraphs = safe
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p.replaceAll("\n", "<br>")}</p>`)
    .join("\n");
  return paragraphs || "<p></p>";
}

function renderPostHtml(post) {
  const title = post.title || post.slug || "Field Note";
  const excerpt = post.excerpt || "";
  const date = post.date || "";
  const url = `${SITE_ORIGIN}/field-notes/${post.slug}`;
  const ogImage = post.ogImage || post.image || ""; // optional if you have one

  // Prefer HTML content if available
  const bodyHtml =
    post.html ||
    (post.body ? basicParagraphs(post.body) : "") ||
    (post.content ? basicParagraphs(post.content) : "") ||
    "<p class=\"text-gray-400\">No body content found.</p>";

  const ogImageTags = ogImage
    ? `
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | the manifestorium</title>
  <meta name="description" content="${escapeHtml(excerpt)}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(excerpt)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  ${ogImageTags}

  <meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(excerpt)}" />

  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Space+Grotesk:wght@300;500;700&display=swap" rel="stylesheet">
  <style>
    body { background: #050505; color: #e0e0e0; font-family: 'Space Grotesk', sans-serif; }
    .serif { font-family: 'Cinzel', serif; }
    .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
    .gradient-text { background: linear-gradient(135deg, #fff 0%, #b026ff 50%, #00f3ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .post-body p { margin: 0 0 1rem; }
    .post-body h2 { font-size: 1.5rem; margin: 2rem 0 1rem; font-family: 'Cinzel', serif; }
    .post-body a { color: #67e8f9; text-decoration: underline; }
  </style>
</head>

<body class="min-h-screen pb-24">
  <main class="pt-20 pb-24 px-6 max-w-3xl mx-auto">
    <a href="/field-notes.html" class="text-xs uppercase tracking-widest text-purple-400 hover:text-purple-300 transition">← Back to Field Notes</a>

    <div class="mt-8 glass p-8 rounded-lg">
      <p class="text-xs text-cyan-400 uppercase tracking-widest mb-2">${escapeHtml(date)}</p>
      <h1 class="serif text-4xl mb-6 gradient-text">${escapeHtml(title)}</h1>
      <div class="post-body text-gray-300 leading-relaxed">
        ${bodyHtml}
      </div>
    </div>
  </main>
</body>
</html>`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function main() {
  if (!fs.existsSync(POSTS_JSON)) {
    console.error(`Missing ${POSTS_JSON}. Generate posts.json first.`);
    process.exit(1);
  }

  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, "utf8"));
  if (!Array.isArray(posts)) {
    console.error("posts.json must be an array.");
    process.exit(1);
  }

  let count = 0;
  for (const post of posts) {
    if (!post?.slug) continue;

    // Generate /field-notes/<slug>/index.html
    const outPath = path.join(process.cwd(), "field-notes", post.slug, "index.html");
    const html = renderPostHtml(post);
    writeFile(outPath, html);
    count++;
  }

  console.log(`Generated ${count} field note pages.`);
}

main();
